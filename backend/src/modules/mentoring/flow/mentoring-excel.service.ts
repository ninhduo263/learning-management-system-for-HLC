import { ApiError } from "@config/exception/api-error";
import { User } from "@module/user/entities/user.entity";
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
}
