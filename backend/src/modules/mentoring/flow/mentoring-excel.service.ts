import { ApiError } from "@config/exception/api-error";
import { User } from "@module/user/entities/user.entity";
import { VN_OFFSET_MS } from "@common/utils/vn-date.util";
import { Injectable } from "@nestjs/common";
import { I18nService } from "nestjs-i18n";
import * as XLSX from "xlsx";
import { MentoringFlowService } from "./mentoring-flow.service";
import { RoleRecapStatus, pad2, quarterMonths } from "./mentoring-rules";

const STATUS_LABEL: Record<RoleRecapStatus, string> = {
    SUBMITTED: "Đã nộp",
    LATE: "Nộp muộn",
    MISSING: "Chưa xong",
    PENDING: "Chờ",
    NO_SCHEDULE: "Chưa có lịch",
};

const normalizeHeader = (value: unknown) =>
    String(value ?? "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/đ/gi, "d")
        .toLowerCase()
        .replace(/[^a-z0-9/.-]/g, "");

/** "Đã xong" -> DONE, "Nộp muộn" -> LATE, "Chưa xong" -> MISSING, "Chờ" -> PENDING */
function importedStatus(value: unknown): string | null {
    const text = normalizeHeader(value);
    if (!text) return null;
    if (text.includes("muon") || text.includes("late")) return "LATE";
    if (text.includes("chua") || text.includes("missing")) return "MISSING";
    if (text.includes("cho") || text.includes("pending")) return "PENDING";
    if (
        text.includes("xong") ||
        text.includes("done") ||
        text === "ok" ||
        text.includes("danop")
    ) {
        return "DONE";
    }
    return null;
}

/** Tháng của tiêu đề cột: "10/2026", "10-2026" hoặc ngày "10/1/2026" */
function headerMonth(value: unknown): { month: number; year: number } | null {
    const text = String(value ?? "").trim();
    const full = /^(\d{1,2})\s*[/.-]\s*\d{1,2}\s*[/.-]\s*(\d{4})$/.exec(text);
    const short = /(?:^|\D)(\d{1,2})\s*[/.-]\s*(\d{4})(?:\D|$)/.exec(text);
    const match = full || short;
    if (!match) return null;
    const month = Number(match[1]);
    return month >= 1 && month <= 12 ? { month, year: Number(match[2]) } : null;
}

@Injectable()
export class MentoringExcelService {
    constructor(
        private readonly flowService: MentoringFlowService,
        private readonly i18n: I18nService,
    ) {}

    private errorMessage(error: unknown) {
        if (error instanceof ApiError) {
            return this.i18n.t(`error-message.${error.getCode()}`, {
                args: error.getArgs(),
            }) as string;
        }
        return error instanceof Error ? error.message : String(error);
    }

    /** Import ghép cặp theo định dạng file Excel đang dùng (dòng Mentor, ngay dưới là dòng Mentee) */
    async importPairs(code: string, buffer: Buffer, user: User) {
        const quarter = await this.flowService.getQuarterOrFail(code);
        if (quarter.isLocked) {
            throw ApiError.Conflict("error-mentoring-quarter-locked", {
                code: quarter.code,
            });
        }
        let workbook: XLSX.WorkBook;
        try {
            workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
        } catch {
            throw ApiError.BadRequest("error-import-file-invalid");
        }
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(
            workbook.Sheets[sheetName],
            {
                header: 1,
                raw: false,
                defval: "",
            },
        );
        const headerIndex = rows.findIndex((row) => {
            const headers = row.map(normalizeHeader);
            return (
                headers.some((h) => h.includes("mamentoring")) &&
                headers.some((h) => h.includes("chucdanh"))
            );
        });
        if (headerIndex < 0)
            throw ApiError.BadRequest("error-mentoring-import-header");
        const headers = rows[headerIndex].map(normalizeHeader);
        const col = (name: string) =>
            headers.findIndex((h) => h.includes(name));
        const roleCol = col("chucdanh");
        const idCol = col("hlcid");
        const codeCol = col("mamentoring");
        if (idCol < 0)
            throw ApiError.BadRequest("error-mentoring-import-header");
        const quarterMonthList = quarterMonths(quarter);
        const monthCols = rows[headerIndex]
            .map((header, index) => ({ index, parsed: headerMonth(header) }))
            .filter(
                (item) =>
                    item.parsed &&
                    item.parsed.year === quarter.year &&
                    quarterMonthList.includes(item.parsed.month),
            );

        const result = {
            sheet: sheetName,
            rowsRead: rows.length - headerIndex - 1,
            pairsRead: 0,
            createdPairs: 0,
            updatedPairs: 0,
            failed: 0,
            errors: [] as { row: number; message: string }[],
        };
        let mentorRow: { row: unknown[]; line: number } | null = null;
        for (let i = headerIndex + 1; i < rows.length; i += 1) {
            const row = rows[i];
            const role = normalizeHeader(row[roleCol]);
            if (role === "mentor") {
                if (mentorRow) {
                    result.errors.push({
                        row: mentorRow.line,
                        message: "Dòng Mentor không có dòng Mentee đi kèm",
                    });
                }
                mentorRow = { row, line: i + 1 };
                continue;
            }
            if (role !== "mentee") continue;
            if (!mentorRow) {
                result.errors.push({
                    row: i + 1,
                    message: "Dòng Mentee không có dòng Mentor phía trên",
                });
                continue;
            }
            result.pairsRead += 1;
            const mentorCode = String(mentorRow.row[idCol] ?? "")
                .replace(/\s+/g, "")
                .toUpperCase();
            const menteeCode = String(row[idCol] ?? "")
                .replace(/\s+/g, "")
                .toUpperCase();
            const codeMonth = headerMonth(
                String(mentorRow.row[codeCol] ?? "").split(/[-\s]/)[0],
            );
            const startMonth =
                codeMonth &&
                codeMonth.year === quarter.year &&
                quarterMonthList.includes(codeMonth.month)
                    ? codeMonth.month
                    : quarterMonthList[0];
            const statuses: Record<number, Record<string, string>> = {};
            for (const { index, parsed } of monthCols) {
                const mentorStatus = importedStatus(mentorRow.row[index]);
                const menteeStatus = importedStatus(row[index]) ?? mentorStatus;
                if (mentorStatus || menteeStatus) {
                    statuses[parsed.month] = {
                        mentor: mentorStatus ?? menteeStatus,
                        mentee: menteeStatus,
                    };
                }
            }
            try {
                const created = await this.flowService.createPairFromImport(
                    quarter.code,
                    { mentorCode, menteeCode, month: startMonth },
                    statuses,
                    user,
                );
                if (created.created) result.createdPairs += 1;
                else result.updatedPairs += 1;
            } catch (error) {
                result.errors.push({
                    row: i + 1,
                    message: `${menteeCode}: ${this.errorMessage(error)}`,
                });
            }
            mentorRow = null;
        }
        if (mentorRow) {
            result.errors.push({
                row: mentorRow.line,
                message: "Dòng Mentor không có dòng Mentee đi kèm",
            });
        }
        result.failed = result.errors.length;
        return result;
    }

    /** File báo cáo quý (chỉ xuất sau khi quý kết thúc) */
    async exportQuarterReport(
        code: string,
    ): Promise<{ fileName: string; buffer: Buffer }> {
        const report = await this.flowService.getQuarterReport(code);
        if (!report.quarter.hasEnded) {
            throw ApiError.Conflict("error-mentoring-report-not-ready", {
                code: report.quarter.code,
            });
        }
        const rows = report.rows.map((row) => {
            const line: Record<string, string | number> = {
                STT: row.serial ?? "",
                Quý: `Q${report.quarter.quarter}/${report.quarter.year}`,
                "Vai trò": row.role === "MENTOR" ? "Mentor" : "Mentee",
                "Họ và tên": row.member?.fullName ?? "",
                "HLC ID": row.member?.memberCode ?? "",
                Profile: row.member?.profileUrl ?? "",
            };
            for (const month of report.quarter.months) {
                const cell = row.months[month];
                const prefix = `Tháng ${pad2(month)}`;
                line[`${prefix} - Mã mentoring`] = cell?.code ?? "";
                line[`${prefix} - Trạng thái recap`] = cell
                    ? STATUS_LABEL[cell.status]
                    : "";
            }
            return line;
        });
        const workbook = XLSX.utils.book_new();
        const sheet = XLSX.utils.json_to_sheet(rows);
        sheet["!cols"] = Object.keys(rows[0] ?? { STT: "" }).map((key) => ({
            wch: Math.max(10, key.length + 2),
        }));
        XLSX.utils.book_append_sheet(
            workbook,
            sheet,
            `Q${report.quarter.quarter} ${report.quarter.year}`,
        );
        return {
            fileName: `hlc-mentoring-Q${report.quarter.quarter}-${report.quarter.year}.xlsx`,
            buffer: XLSX.write(workbook, {
                type: "buffer",
                bookType: "xlsx",
            }) as Buffer,
        };
    }

    // ------------------------------------------------------------------
    // Lịch mentoring: xuất mẫu chuẩn -> sửa trên file -> nhập lại
    // ------------------------------------------------------------------

    static readonly SCHEDULE_MARKER = "HLC_LICH_MENTORING_V1";
    static readonly SCHEDULE_HEADERS = [
        "Mã buổi",
        "Tháng",
        "Mã mentor",
        "Tên mentor",
        "Mã mentee",
        "Tên mentee",
        "Bắt đầu (dd/MM/yyyy HH:mm)",
        "Kết thúc (dd/MM/yyyy HH:mm)",
        "Địa điểm",
        "Link meeting",
        "Ghi chú",
        "Lý do thay đổi (bắt buộc nếu sửa)",
    ];

    private formatVn(value?: Date | string | null) {
        if (!value) return "";
        const date = new Date(new Date(value).getTime() + VN_OFFSET_MS);
        return `${pad2(date.getUTCDate())}/${pad2(date.getUTCMonth() + 1)}/${date.getUTCFullYear()} ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}`;
    }

    /** Ô ngày giờ: chuỗi "dd/MM/yyyy HH:mm" (hoặc "yyyy-MM-dd HH:mm") hay số ngày Excel; hiểu theo giờ VN */
    private parseVn(value: unknown): Date | null | "invalid" {
        if (
            value === null ||
            value === undefined ||
            String(value).trim() === ""
        )
            return null;
        if (typeof value === "number") {
            const parsed = XLSX.SSF.parse_date_code(value);
            if (!parsed) return "invalid";
            return new Date(
                Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M) -
                    VN_OFFSET_MS,
            );
        }
        const text = String(value).trim();
        const vn = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/.exec(
            text,
        );
        const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2})$/.exec(
            text,
        );
        let parts: number[] | null = null;
        if (vn)
            parts = [
                Number(vn[3]),
                Number(vn[2]),
                Number(vn[1]),
                Number(vn[4]),
                Number(vn[5]),
            ];
        else if (iso)
            parts = [
                Number(iso[1]),
                Number(iso[2]),
                Number(iso[3]),
                Number(iso[4]),
                Number(iso[5]),
            ];
        if (!parts) return "invalid";
        const [year, month, day, hour, minute] = parts;
        const date = new Date(
            Date.UTC(year, month - 1, day, hour, minute) - VN_OFFSET_MS,
        );
        const check = new Date(date.getTime() + VN_OFFSET_MS);
        if (
            check.getUTCDate() !== day ||
            check.getUTCMonth() !== month - 1 ||
            hour > 23 ||
            minute > 59
        )
            return "invalid";
        return date;
    }

    async exportSchedules(
        code: string,
    ): Promise<{ fileName: string; buffer: Buffer }> {
        const board = await this.flowService.getQuarterBoard(code);
        const sessions = board.sessions
            .filter((session) => session.status !== "CANCELLED")
            .sort((a, b) => a.month - b.month || a.code.localeCompare(b.code));
        const rows: unknown[][] = [
            [
                MentoringExcelService.SCHEDULE_MARKER,
                board.quarter.code,
                "Không sửa dòng này, tên cột và các cột mã. Chỉ sửa giờ, địa điểm, link, ghi chú và ghi lý do.",
            ],
            MentoringExcelService.SCHEDULE_HEADERS,
            ...sessions.map((session) => [
                session.code,
                `${pad2(session.month)}/${session.year}`,
                session.mentor?.memberCode ?? "",
                session.mentor?.fullName ?? "",
                session.mentee?.memberCode ?? "",
                session.mentee?.fullName ?? "",
                this.formatVn(session.schedule?.startAt),
                this.formatVn(session.schedule?.endAt),
                session.schedule?.location ?? "",
                session.schedule?.meetingLink ?? "",
                session.schedule?.note ?? "",
                "",
            ]),
        ];
        const sheet = XLSX.utils.aoa_to_sheet(rows);
        // Ép mọi ô là chữ để Excel không tự đổi định dạng ngày giờ
        for (const key of Object.keys(sheet)) {
            if (!key.startsWith("!") && sheet[key].t !== "s") {
                sheet[key].t = "s";
                sheet[key].v = String(sheet[key].v ?? "");
            }
        }
        sheet["!cols"] = [22, 9, 15, 24, 15, 24, 22, 22, 20, 30, 30, 32].map(
            (wch) => ({ wch }),
        );
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, sheet, "LICH_MENTORING");
        return {
            fileName: `hlc-lich-mentoring-${board.quarter.code}.xlsx`,
            buffer: XLSX.write(workbook, {
                type: "buffer",
                bookType: "xlsx",
            }) as Buffer,
        };
    }

    /**
     * Nhập lại file lịch đã xuất. Kiểm tra toàn bộ file trước;
     * có bất kỳ dòng lỗi nào thì từ chối cả file, không thay đổi dữ liệu.
     * dryRun = true: chỉ kiểm tra, trả danh sách thay đổi.
     */
    async importSchedules(
        code: string,
        buffer: Buffer,
        user: User,
        dryRun: boolean,
    ) {
        const board = await this.flowService.getQuarterBoard(code);
        if (board.quarter.isLocked)
            throw ApiError.Conflict("error-mentoring-quarter-locked", {
                code: board.quarter.code,
            });
        let workbook: XLSX.WorkBook;
        try {
            workbook = XLSX.read(buffer, { type: "buffer" });
        } catch {
            throw ApiError.BadRequest("error-import-file-invalid");
        }
        const sheet =
            workbook.Sheets["LICH_MENTORING"] ??
            workbook.Sheets[workbook.SheetNames[0]];
        const rows = sheet
            ? XLSX.utils.sheet_to_json<unknown[]>(sheet, {
                  header: 1,
                  raw: true,
                  defval: "",
              })
            : [];
        const errors: { row: number; message: string }[] = [];
        const marker = String(rows[0]?.[0] ?? "").trim();
        const fileQuarter = String(rows[0]?.[1] ?? "").trim();
        const headers = (rows[1] ?? []).map((cell) =>
            String(cell ?? "").trim(),
        );
        if (
            marker !== MentoringExcelService.SCHEDULE_MARKER ||
            MentoringExcelService.SCHEDULE_HEADERS.some(
                (header, index) => headers[index] !== header,
            )
        ) {
            return {
                valid: false,
                applied: false,
                errors: [
                    {
                        row: 1,
                        message:
                            "File không đúng mẫu lịch mentoring của hệ thống. Hãy xuất file mẫu rồi sửa trên file đó.",
                    },
                ],
                changes: [],
            };
        }
        if (fileQuarter !== board.quarter.code) {
            return {
                valid: false,
                applied: false,
                errors: [
                    {
                        row: 1,
                        message: `File là lịch quý ${fileQuarter}, không phải quý ${board.quarter.code}`,
                    },
                ],
                changes: [],
            };
        }
        const sessions = new Map(
            board.sessions
                .filter((session) => session.status !== "CANCELLED")
                .map((session) => [session.code, session]),
        );
        const seen = new Set<string>();
        const changes: {
            row: number;
            sessionId: string;
            sessionCode: string;
            mentor: string;
            mentee: string;
            oldStartAt: Date | null;
            oldEndAt: Date | null;
            startAt: Date;
            endAt: Date;
            location: string | null;
            meetingLink: string | null;
            note: string | null;
            reason: string;
        }[] = [];
        const text = (value: unknown) => String(value ?? "").trim();
        for (let index = 2; index < rows.length; index += 1) {
            const row = rows[index];
            const line = index + 1;
            if (!row || row.every((cell) => text(cell) === "")) continue;
            const sessionCode = text(row[0]).toUpperCase();
            const session = sessions.get(sessionCode);
            const fail = (message: string) =>
                errors.push({
                    row: line,
                    message: `${sessionCode || "(trống)"}: ${message}`,
                });
            if (!session) {
                fail("Mã buổi không thuộc quý này hoặc đã hủy");
                continue;
            }
            if (seen.has(sessionCode)) {
                fail("Mã buổi bị lặp trong file");
                continue;
            }
            seen.add(sessionCode);
            if (
                text(row[2]).toUpperCase() !==
                    (session.mentor?.memberCode ?? "") ||
                text(row[4]).toUpperCase() !==
                    (session.mentee?.memberCode ?? "")
            ) {
                fail(
                    "Mã mentor/mentee không khớp với cặp trên hệ thống (không đổi cặp qua file lịch)",
                );
                continue;
            }
            const startAt = this.parseVn(row[6]);
            const endAt = this.parseVn(row[7]);
            if (startAt === "invalid" || endAt === "invalid") {
                fail("Ngày giờ phải có dạng dd/MM/yyyy HH:mm");
                continue;
            }
            if (!startAt && !endAt) {
                if (session.schedule)
                    fail("Không được xóa lịch đã có qua file");
                continue;
            }
            if (!startAt || !endAt) {
                fail("Cần nhập cả giờ bắt đầu và giờ kết thúc");
                continue;
            }
            if (endAt <= startAt) {
                fail("Giờ kết thúc phải sau giờ bắt đầu");
                continue;
            }
            const local = new Date(startAt.getTime() + VN_OFFSET_MS);
            const localEnd = new Date(endAt.getTime() - 1 + VN_OFFSET_MS);
            if (
                local.getUTCMonth() + 1 !== session.month ||
                local.getUTCFullYear() !== session.year ||
                localEnd.getUTCMonth() + 1 !== session.month
            ) {
                fail(
                    `Lịch phải nằm trong tháng ${pad2(session.month)}/${session.year}`,
                );
                continue;
            }
            const location = text(row[8]) || null;
            const meetingLink = text(row[9]) || null;
            const note = text(row[10]) || null;
            const reason = text(row[11]);
            const old = session.schedule;
            const changed =
                !old ||
                new Date(old.startAt).getTime() !== startAt.getTime() ||
                new Date(old.endAt).getTime() !== endAt.getTime() ||
                (old.location ?? null) !== location ||
                (old.meetingLink ?? null) !== meetingLink ||
                (old.note ?? null) !== note;
            if (!changed) continue;
            if (!reason) {
                fail("Dòng có thay đổi nhưng thiếu lý do thay đổi");
                continue;
            }
            changes.push({
                row: line,
                sessionId: session._id,
                sessionCode,
                mentor: session.mentor?.fullName ?? "",
                mentee: session.mentee?.fullName ?? "",
                oldStartAt: old ? new Date(old.startAt) : null,
                oldEndAt: old ? new Date(old.endAt) : null,
                startAt,
                endAt,
                location,
                meetingLink,
                note,
                reason,
            });
        }
        if (errors.length || dryRun || !changes.length) {
            return { valid: !errors.length, applied: false, errors, changes };
        }
        await this.flowService.applyScheduleOverrides(changes, user);
        return { valid: true, applied: true, errors, changes };
    }
}
