import { createUserPassword } from "@common/constant";
import { ApiError } from "@config/exception/api-error";
import { UserModel } from "@module/repository/sequelize/model/user.model";
import { SystemRole } from "@module/user/common/constant";
import { User } from "@module/user/entities/user.entity";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Op } from "sequelize";
import * as XLSX from "xlsx";
import { MemberStatus, MemberType } from "../common/constant";
import { MemberModel } from "../models/member.model";

const normalizeHeader = (value: unknown) =>
    String(value ?? "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/đ/gi, "d")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

/** Bí danh tiêu đề cột (giữ tương thích file Excel thành viên đang dùng) */
const COLUMNS: Record<string, string[]> = {
    memberCode: [
        "HLC ID (Nhập tay)",
        "HLC ID",
        "Mã định danh",
        "Mã thành viên",
        "memberCode",
    ],
    fullName: ["HỌ VÀ TÊN (Nhập tay)", "HỌ VÀ TÊN", "Họ tên", "fullName"],
    email: ["EMAIL (Nhập tay)", "EMAIL", "email"],
    phone: ["SĐT (Nhập tay)", "SĐT", "Số điện thoại", "Điện thoại", "phone"],
    bankAccount: [
        "SỐ TÀI KHOẢN (Nhập tay)",
        "SỐ TÀI KHOẢN",
        "STK",
        "bankAccount",
    ],
    bankName: ["NGÂN HÀNG (Chọn list)", "NGÂN HÀNG", "bankName"],
    dateOfBirth: ["NGÀY SINH", "dateOfBirth", "dob"],
    livingAllowanceType: [
        "DIỆN HỖ TRỢ SINH HOẠT PHÍ (Chọn list)",
        "DIỆN HỖ TRỢ SINH HOẠT PHÍ",
        "Diện hỗ trợ",
        "livingAllowanceType",
    ],
    joinedAt: [
        "THỜI GIAN GIA NHẬP HLC (Chọn ngày)",
        "Thời gian gia nhập HLC",
        "joinedAt",
    ],
    allowanceStartDate: [
        "THỜI GIAN BẮT ĐẦU NHẬN TRỢ CẤP (Chọn ngày)",
        "Thời gian bắt đầu nhận trợ cấp",
        "allowanceStartDate",
    ],
    profileUrl: ["PROFILE", "Link profile", "profileUrl"],
    status: ["Trạng thái", "Đang hoạt động", "isActive", "status"],
    note: ["Ghi chú", "note"],
};

const pad2 = (value: number) => String(value).padStart(2, "0");

/** dd/mm/yyyy, yyyy-mm-dd hoặc số serial Excel -> YYYY-MM-DD; "" -> null; sai -> undefined */
function parseDate(raw: unknown): string | null | undefined {
    if (raw === null || raw === undefined || String(raw).trim() === "")
        return null;
    if (typeof raw === "number") {
        const parsed = XLSX.SSF.parse_date_code(raw);
        return parsed
            ? `${parsed.y}-${pad2(parsed.m)}-${pad2(parsed.d)}`
            : undefined;
    }
    const text = String(raw).trim();
    const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text);
    const ymd = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text);
    const [year, month, day] = dmy
        ? [Number(dmy[3]), Number(dmy[2]), Number(dmy[1])]
        : ymd
          ? [Number(ymd[1]), Number(ymd[2]), Number(ymd[3])]
          : [NaN, NaN, NaN];
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
        Number.isNaN(date.getTime()) ||
        date.getUTCDate() !== day ||
        date.getUTCMonth() !== month - 1
    ) {
        return undefined;
    }
    return `${year}-${pad2(month)}-${pad2(day)}`;
}

function normalizePhone(raw: unknown) {
    let phone = String(raw ?? "")
        .trim()
        .replace(/[^\d+]/g, "");
    if (/^\d{9}$/.test(phone)) phone = `0${phone}`;
    if (/^\+84\d{9}$/.test(phone)) phone = `0${phone.slice(3)}`;
    return phone || null;
}

function parseStatus(raw: unknown): MemberStatus | null | undefined {
    const text = normalizeHeader(raw);
    if (!text) return null;
    if (
        [
            "yes",
            "co",
            "active",
            "true",
            "1",
            "danghoatdong",
            "hoatdong",
        ].includes(text)
    )
        return MemberStatus.ACTIVE;
    if (
        [
            "no",
            "khong",
            "inactive",
            "false",
            "0",
            "nghi",
            "ngunghoatdong",
        ].includes(text)
    )
        return MemberStatus.INACTIVE;
    return undefined;
}

/** Ngày sinh YYYY-MM-DD -> mật khẩu ddmmyyyy (giống quy ước hệ thống cũ) */
const birthDatePassword = (dateOfBirth?: string | null) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateOfBirth ?? ""));
    return match ? `${match[3]}${match[2]}${match[1]}` : null;
};

@Injectable()
export class MemberToolsService {
    constructor(
        @InjectModel(MemberModel)
        private readonly memberModel: typeof MemberModel,
        @InjectModel(UserModel)
        private readonly userModel: typeof UserModel,
    ) {}

    async getMemberOfUser(user: User) {
        const member = await this.memberModel.findOne({
            where: { userId: user._id },
            raw: true,
        });
        return member ?? null;
    }

    /** Import/cập nhật thành viên từ file Excel (theo mã thành viên). Mọi sheet đều được đọc. */
    async importFile(buffer: Buffer) {
        let workbook: XLSX.WorkBook;
        try {
            workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
        } catch {
            throw ApiError.BadRequest("error-import-file-invalid");
        }
        const result = {
            created: 0,
            updated: 0,
            failed: 0,
            errors: [] as { sheet: string; row: number; message: string }[],
        };
        const seen = new Set<string>();
        for (const sheetName of workbook.SheetNames) {
            const rows = XLSX.utils.sheet_to_json<unknown[]>(
                workbook.Sheets[sheetName],
                {
                    header: 1,
                    raw: true,
                    defval: "",
                },
            );
            const memberCodeAliases = COLUMNS.memberCode.map(normalizeHeader);
            const headerIndex = rows.findIndex((row) =>
                row.some((cell) =>
                    memberCodeAliases.includes(normalizeHeader(cell)),
                ),
            );
            if (headerIndex < 0) continue;
            const headers = rows[headerIndex].map(normalizeHeader);
            const columnOf = Object.fromEntries(
                Object.entries(COLUMNS).map(([field, aliases]) => [
                    field,
                    aliases
                        .map(normalizeHeader)
                        .map((alias) => headers.indexOf(alias))
                        .find((index) => index >= 0) ?? -1,
                ]),
            );
            for (let i = headerIndex + 1; i < rows.length; i += 1) {
                const row = rows[i];
                const cell = (field: string) =>
                    columnOf[field] >= 0 ? row[columnOf[field]] : "";
                const text = (field: string) =>
                    String(cell(field) ?? "")
                        .trim()
                        .replace(/\s+/g, " ");
                const memberCode = text("memberCode")
                    .replace(/\s+/g, "")
                    .toUpperCase();
                const fullName = text("fullName");
                if (!memberCode && !fullName) continue;
                const fail = (message: string) => {
                    result.errors.push({
                        sheet: sheetName,
                        row: i + 1,
                        message: `${memberCode || "?"}: ${message}`,
                    });
                };
                const typeMatch = /^HLC-(MTE|MTO)-\d{5}$/.exec(memberCode);
                if (!typeMatch) {
                    fail(
                        "Mã thành viên phải có dạng HLC-MTE-xxxxx hoặc HLC-MTO-xxxxx",
                    );
                    continue;
                }
                if (!fullName) {
                    fail("Thiếu họ và tên");
                    continue;
                }
                if (seen.has(memberCode)) {
                    fail("Mã thành viên bị lặp trong file");
                    continue;
                }
                seen.add(memberCode);
                const email = text("email").replace(/\s+/g, "").toLowerCase();
                if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    fail("Email không hợp lệ");
                    continue;
                }
                const dates: Record<string, string | null> = {};
                let badDate: string | null = null;
                for (const field of [
                    "dateOfBirth",
                    "joinedAt",
                    "allowanceStartDate",
                ]) {
                    const parsed = parseDate(cell(field));
                    if (parsed === undefined) badDate = field;
                    else dates[field] = parsed;
                }
                if (badDate) {
                    fail(`Ngày không hợp lệ ở cột ${COLUMNS[badDate][0]}`);
                    continue;
                }
                const status = parseStatus(cell("status"));
                if (status === undefined) {
                    fail("Trạng thái chỉ nhận yes/no hoặc có/không");
                    continue;
                }
                const values = {
                    memberCode,
                    memberType:
                        typeMatch[1] === "MTE"
                            ? MemberType.MENTEE
                            : MemberType.MENTOR,
                    fullName,
                    email: email || null,
                    phone: normalizePhone(cell("phone")),
                    bankAccount: text("bankAccount") || null,
                    bankName: text("bankName") || null,
                    livingAllowanceType: text("livingAllowanceType") || null,
                    profileUrl: text("profileUrl") || null,
                    note: text("note") || null,
                    ...dates,
                    ...(status ? { status } : {}),
                };
                const existing = await this.memberModel.findOne({
                    where: { memberCode },
                });
                if (existing) {
                    await existing.update(values);
                    result.updated += 1;
                } else {
                    await this.memberModel.create(values);
                    result.created += 1;
                }
            }
        }
        result.failed = result.errors.length;
        return result;
    }

    /**
     * Tạo tài khoản cho thành viên chưa có: username = mã thành viên viết thường,
     * mật khẩu = ngày sinh ddmmyyyy (không có ngày sinh thì dùng defaultPassword).
     * Nếu đã có user trùng username thì chỉ liên kết, không đổi mật khẩu.
     */
    async generateAccounts(options: {
        memberCodes?: string[];
        defaultPassword?: string;
    }) {
        const where: Record<string, unknown> = {
            userId: null,
            status: MemberStatus.ACTIVE,
        };
        if (options.memberCodes?.length) {
            where.memberCode = {
                [Op.in]: options.memberCodes.map((code) => code.toUpperCase()),
            };
        }
        const members = await this.memberModel.findAll({
            where,
            order: [["memberCode", "ASC"]],
        });
        const result = {
            created: [] as {
                memberCode: string;
                username: string;
                passwordSource: "dateOfBirth" | "default";
            }[],
            linked: [] as { memberCode: string; username: string }[],
            skipped: [] as { memberCode: string; reason: string }[],
        };
        for (const member of members) {
            const username = member.memberCode.toLowerCase();
            const existingUser = await this.userModel.findOne({
                where: { username },
            });
            if (existingUser) {
                await member.update({ userId: existingUser._id });
                result.linked.push({ memberCode: member.memberCode, username });
                continue;
            }
            const fromBirth = birthDatePassword(member.dateOfBirth);
            const password = fromBirth ?? options.defaultPassword;
            if (!password) {
                result.skipped.push({
                    memberCode: member.memberCode,
                    reason: "Chưa có ngày sinh và chưa nhập mật khẩu mặc định",
                });
                continue;
            }
            const user = await this.userModel.create({
                username,
                password: await createUserPassword(password),
                email: member.email || `${username}@hlc.local`,
                fullname: member.fullName,
                systemRole:
                    member.memberType === MemberType.MENTOR
                        ? SystemRole.MENTOR
                        : SystemRole.MENTEE,
            });
            await member.update({ userId: user._id });
            result.created.push({
                memberCode: member.memberCode,
                username,
                passwordSource: fromBirth ? "dateOfBirth" : "default",
            });
        }
        return result;
    }
}
