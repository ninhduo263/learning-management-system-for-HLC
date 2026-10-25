import { createUserPassword } from "@common/constant";
import { vnDateKey } from "@common/utils/vn-date.util";
import { ApiError } from "@config/exception/api-error";
import { ActivityLogService } from "@module/activity-log/activity-log.service";
import { GroupFlowService } from "@module/organization/flow/group-flow.service";
import { UserModel } from "@module/repository/sequelize/model/user.model";
import { TimeService } from "@module/time/time.service";
import { SystemRole } from "@module/user/common/constant";
import { User } from "@module/user/entities/user.entity";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { randomInt } from "crypto";
import { Transaction } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import { CatalogService } from "@module/catalog/catalog.service";
import { MemberStatus, MemberType } from "../common/constant";
import { CreateMemberAdminDto } from "../dto/create-member-admin.dto";
import { MemberModel } from "../models/member.model";
import { ProvinceService } from "./province.service";

const CODE_PATTERN = /^HLC-(MTE|MTO)-(\d{5})$/i;
/** Khóa tư vấn (advisory lock) cấp mã thành viên: 2 thao tác thêm cùng lúc không nhận cùng 1 mã */
const CODE_LOCK_KEY = 4815162342;
const PREFIX: Record<string, string> = {
    [MemberType.MENTEE]: "MTE",
    [MemberType.MENTOR]: "MTO",
};

const normalizeName = (value: string) =>
    value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("vi");

/** Ẩn bớt dữ liệu nhạy cảm khi hiển thị trong danh sách */
export const maskSensitive = (value?: string | null) =>
    value
        ? `${"•".repeat(Math.max(value.length - 3, 3))}${value.slice(-3)}`
        : null;

/** Mật khẩu khởi tạo ngẫu nhiên: 10 ký tự, đủ chữ hoa, chữ thường, số */
const initialPassword = () => {
    const sets = [
        "ABCDEFGHJKLMNPQRSTUVWXYZ",
        "abcdefghijkmnpqrstuvwxyz",
        "23456789",
    ];
    const all = sets.join("");
    const chars = [
        ...sets.map((set) => set[randomInt(set.length)]),
        ...Array.from({ length: 7 }, () => all[randomInt(all.length)]),
    ];
    for (let index = chars.length - 1; index > 0; index -= 1) {
        const swap = randomInt(index + 1);
        [chars[index], chars[swap]] = [chars[swap], chars[index]];
    }
    return chars.join("");
};

/**
 * Admin toàn cục thêm thành viên mới (MTE, MTO) trên web: mã tự sinh theo dãy số chung, tạo tài khoản đăng nhập
 * (tên đăng nhập = mã thành viên) và mật khẩu khởi tạo, gán nhóm, cảnh báo trùng người, chặn trùng CCCD.
 */
@Injectable()
export class MemberAdminService {
    constructor(
        private readonly sequelize: Sequelize,
        private readonly timeService: TimeService,
        private readonly provinces: ProvinceService,
        private readonly groupFlow: GroupFlowService,
        private readonly activityLog: ActivityLogService,
        private readonly catalogs: CatalogService,
        @InjectModel(MemberModel)
        private readonly memberModel: typeof MemberModel,
        @InjectModel(UserModel)
        private readonly userModel: typeof UserModel,
    ) {}

    /**
     * Mã kế tiếp: đếm toàn bộ hồ sơ (MTE + MTO, kể cả ngừng hoạt động) + 1. Nếu không khớp số lớn nhất đã dùng
     * + 1 hoặc mã đã tồn tại: cảnh báo, dùng số lớn nhất + 1. Vẫn trùng thì không cho thêm.
     */
    async nextCode(memberType: MemberType | string, t?: Transaction) {
        const prefix = PREFIX[memberType];
        if (!prefix) throw ApiError.BadRequest("error-validation-failed");
        const rows = await this.memberModel.findAll({
            attributes: ["memberCode"],
            raw: true,
            transaction: t,
        });
        const used = new Set<number>();
        for (const row of rows) {
            const match = CODE_PATTERN.exec(row.memberCode ?? "");
            if (match) used.add(Number(match[2]));
        }
        const codes = new Set(rows.map((row) => row.memberCode.toUpperCase()));
        const total = rows.length;
        const max = used.size ? Math.max(...used) : 0;
        const format = (seq: number) =>
            `HLC-${prefix}-${String(seq).padStart(5, "0")}`;
        const byCount = total + 1;
        if (
            byCount === max + 1 &&
            !used.has(byCount) &&
            !codes.has(format(byCount))
        )
            return {
                code: format(byCount),
                method: "COUNT" as const,
                total,
                maxSequence: max,
                warning: null as string | null,
            };
        const fallback = max + 1;
        const warning = `Tổng hồ sơ (${total}) + 1 = ${byCount} không khớp số lớn nhất đã dùng (${max}) + 1${used.has(byCount) ? ` hoặc số ${byCount} đã có người dùng` : ""}: dùng phương án số lớn nhất + 1 = ${fallback}.`;
        if (
            fallback > 99999 ||
            used.has(fallback) ||
            codes.has(format(fallback))
        )
            throw ApiError.Conflict("error-member-code-conflict", {
                code: format(fallback),
            });
        return {
            code: format(fallback),
            method: "MAX_PLUS_ONE" as const,
            total,
            maxSequence: max,
            warning,
        };
    }

    /** Hồ sơ có cùng họ tên và ngày sinh (kể cả ngừng hoạt động) */
    async findDuplicates(fullName: string, dateOfBirth: string) {
        const rows = await this.memberModel.findAll({
            where: { dateOfBirth },
            raw: true,
        });
        const name = normalizeName(fullName);
        return rows
            .filter((row) => normalizeName(row.fullName) === name)
            .map((row) => ({
                _id: row._id,
                memberCode: row.memberCode,
                fullName: row.fullName,
                memberType: row.memberType,
                dateOfBirth: row.dateOfBirth,
                status: row.status,
                phone: row.phone ?? null,
                email: row.email ?? null,
            }));
    }

    private async assertNationalIdFree(
        nationalId?: string | null,
        exceptId?: string,
    ) {
        if (!nationalId) return;
        const existing = await this.memberModel.findOne({
            where: { nationalId },
            raw: true,
        });
        if (existing && existing._id !== exceptId)
            throw ApiError.Conflict("error-national-id-duplicate", {
                code: existing.memberCode,
                name: existing.fullName,
            });
    }

    /** Kiểm tra trước khi lưu: mã sẽ cấp, cảnh báo trùng người, chặn trùng CCCD */
    async precheck(dto: Partial<CreateMemberAdminDto>) {
        await this.assertNationalIdFree(dto.nationalId);
        return {
            next: dto.memberType ? await this.nextCode(dto.memberType) : null,
            duplicates:
                dto.fullName && dto.dateOfBirth
                    ? await this.findDuplicates(dto.fullName, dto.dateOfBirth)
                    : [],
        };
    }

    async create(user: User, dto: CreateMemberAdminDto) {
        const fullName = dto.fullName.trim().replace(/\s+/g, " ");
        await this.provinces.assertCode(dto.hometownCode);
        await this.provinces.assertCode(dto.addressCode);
        const bank = dto.bankAccount
            ? await this.catalogs.bank(dto.bankCode).catch(() => null)
            : null;
        if (dto.bankAccount && !bank)
            throw ApiError.BadRequest("error-bank-name-invalid");
        const majorCodes = await this.catalogs.resolve(
            "CAREER",
            dto.majorCodes ?? [],
        );
        const occupationCodes = await this.catalogs.resolve(
            "CAREER",
            dto.occupationCodes ?? [],
        );
        if (dto.memberType === MemberType.MENTEE && !dto.groupId)
            throw ApiError.BadRequest("error-member-group-required");
        await this.assertNationalIdFree(dto.nationalId);
        const duplicates = await this.findDuplicates(fullName, dto.dateOfBirth);
        if (duplicates.length && !dto.confirmDuplicate)
            throw ApiError.Conflict("error-member-possible-duplicate", {
                codes: duplicates.map((item) => item.memberCode).join(", "),
            });
        const password = initialPassword();
        const result = await this.sequelize.transaction(async (t) => {
            await this.sequelize.query("SELECT pg_advisory_xact_lock(:key)", {
                replacements: { key: CODE_LOCK_KEY },
                transaction: t,
            });
            const next = await this.nextCode(dto.memberType, t);
            await this.assertNationalIdFree(dto.nationalId);
            const username = next.code.toLowerCase();
            if (
                await this.userModel.count({
                    where: { username },
                    transaction: t,
                })
            )
                throw ApiError.Conflict("error-member-code-conflict", {
                    code: next.code,
                });
            const account = await this.userModel.create(
                {
                    username,
                    password: await createUserPassword(password),
                    email: dto.email.trim(),
                    fullname: fullName,
                    systemRole:
                        dto.memberType === MemberType.MENTOR
                            ? SystemRole.MENTOR
                            : SystemRole.MENTEE,
                },
                { transaction: t },
            );
            const member = await this.memberModel.create(
                {
                    memberCode: next.code,
                    memberType: dto.memberType,
                    fullName,
                    gender: dto.gender,
                    dateOfBirth: dto.dateOfBirth,
                    hometownCode: dto.hometownCode,
                    addressCode: dto.addressCode,
                    phone: dto.phone.trim(),
                    email: dto.email.trim(),
                    nationalId: dto.nationalId || null,
                    bankAccount: dto.bankAccount || null,
                    bankCode: bank?.code ?? null,
                    bankName: bank?.display ?? null,
                    majorCodes,
                    occupationCodes,
                    status: MemberStatus.ACTIVE,
                    joinedAt: vnDateKey(this.timeService.now()),
                    userId: account._id,
                },
                { transaction: t },
            );
            const group = dto.groupId
                ? await this.groupFlow.joinGroup(
                      dto.groupId,
                      { _id: member._id, memberType: dto.memberType },
                      user,
                      t,
                      "Thêm thành viên mới",
                  )
                : null;
            return { member: member.get({ plain: true }), next, group };
        });
        await this.activityLog.log(user, {
            module: "MEMBER",
            action: "MEMBER_CREATE",
            targetId: result.member._id,
            targetName: `${result.member.memberCode} - ${fullName}`,
            summary: `Thêm thành viên ${result.member.memberCode} - ${fullName}${result.group ? ` vào ${result.group.name}` : ""}, tạo tài khoản đăng nhập ${result.member.memberCode.toLowerCase()}${result.next.warning ? `. Cảnh báo mã: ${result.next.warning}` : ""}${duplicates.length ? `. Đã xác nhận dù trùng họ tên + ngày sinh với ${duplicates.map((item) => item.memberCode).join(", ")}` : ""}`,
            detail: {
                method: result.next.method,
                total: result.next.total,
                maxSequence: result.next.maxSequence,
                duplicates: duplicates.map((item) => item.memberCode),
            },
        });
        return {
            member: {
                ...result.member,
                nationalId: maskSensitive(result.member.nationalId),
                bankAccount: maskSensitive(result.member.bankAccount),
            },
            group: result.group
                ? { _id: result.group._id, name: result.group.name }
                : null,
            codeMethod: result.next.method,
            codeWarning: result.next.warning,
            /** Chỉ trả 1 lần cho người tạo; máy chủ chỉ lưu mã băm */
            account: {
                username: result.member.memberCode.toLowerCase(),
                password,
            },
        };
    }

    /** Admin toàn cục xem đầy đủ CCCD, số tài khoản (ghi nhật ký) */
    async sensitive(user: User, memberId: string) {
        const member = await this.memberModel.findByPk(memberId, { raw: true });
        if (!member) throw ApiError.NotFound("error-record-not-found");
        await this.activityLog.log(user, {
            module: "MEMBER",
            action: "MEMBER_SENSITIVE_VIEW",
            targetId: member._id,
            targetName: `${member.memberCode} - ${member.fullName}`,
            summary: `Xem số CCCD / số tài khoản của ${member.memberCode} - ${member.fullName}`,
        });
        return {
            nationalId: member.nationalId ?? null,
            bankAccount: member.bankAccount ?? null,
            bankName: member.bankName ?? null,
        };
    }

    /** Ngân hàng đang dùng (danh mục BANK) */
    async banks() {
        return (await this.catalogs.list("BANK")).map(
            (row) => row.shortName || row.name,
        );
    }
}
