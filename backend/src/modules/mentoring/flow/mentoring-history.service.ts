import { VN_OFFSET_MS } from "@common/utils/vn-date.util";
import { ApiError } from "@config/exception/api-error";
import { MemberType } from "@module/member/common/constant";
import { MemberModel } from "@module/member/models/member.model";
import { User } from "@module/user/entities/user.entity";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Sequelize } from "sequelize-typescript";
import * as XLSX from "xlsx";
import {
    MentoringPairSource,
    MentoringRole,
    RecapReviewStatus,
    ScheduleLogAction,
} from "../common/constant";
import { MentoringImportBatchModel } from "../models/mentoring-import-batch.model";
import { MentoringPairModel } from "../models/mentoring-pair.model";
import { MentoringQuarterModel } from "../models/mentoring-quarter.model";
import { MentoringRecapModel } from "../models/mentoring-recap.model";
import { MentoringScheduleLogModel } from "../models/mentoring-schedule-log.model";
import { MentoringSessionModel } from "../models/mentoring-session.model";
import { MentoringFlowService } from "./mentoring-flow.service";
import {
    recapDeadlineOf,
    pad2,
    parseQuarterCode,
    quarterMonths,
} from "./mentoring-rules";

const MARKER = "HLC_MENTORING_QUY_CU_V1";
const HEADERS = [
    "Mã buổi (hệ thống)",
    "Tháng (MM/yyyy)",
    "Mã MTO",
    "Tên MTO",
    "Mã MTE",
    "Tên MTE",
    "Bắt đầu (dd/MM/yyyy HH:mm)",
    "Kết thúc (dd/MM/yyyy HH:mm)",
    "Recap MTO - nội dung",
    "Recap MTO - ngày nộp (dd/MM/yyyy HH:mm)",
    "Recap MTO - duyệt (Duyệt / Không duyệt / trống)",
    "Recap MTE - nội dung",
    "Recap MTE - ngày nộp (dd/MM/yyyy HH:mm)",
    "Recap MTE - điểm (0-100, trống = chưa chấm)",
];

export interface PlannedRow {
    row: number;
    month: number;
    mentorCode: string;
    menteeCode: string;
    mentorName: string;
    menteeName: string;
    startAt: Date | null;
    endAt: Date | null;
    mentorRecap: {
        content: string;
        submittedAt: Date;
        review: "APPROVED" | "REJECTED" | "PENDING";
    } | null;
    menteeRecap: {
        content: string;
        submittedAt: Date;
        score: number | null;
    } | null;
}

const text = (value: unknown) => String(value ?? "").trim();

/** Nhập / xuất dữ liệu mentoring quý cũ (từ 2023) theo mẫu chuẩn; mỗi lần nhập là 1 lô có thể hoàn tác */
@Injectable()
export class MentoringHistoryService {
    constructor(
        private readonly sequelize: Sequelize,
        private readonly flowService: MentoringFlowService,
        @InjectModel(MemberModel)
        private readonly memberModel: typeof MemberModel,
        @InjectModel(MentoringQuarterModel)
        private readonly quarterModel: typeof MentoringQuarterModel,
        @InjectModel(MentoringPairModel)
        private readonly pairModel: typeof MentoringPairModel,
        @InjectModel(MentoringSessionModel)
        private readonly sessionModel: typeof MentoringSessionModel,
        @InjectModel(MentoringRecapModel)
        private readonly recapModel: typeof MentoringRecapModel,
        @InjectModel(MentoringScheduleLogModel)
        private readonly scheduleLogModel: typeof MentoringScheduleLogModel,
        @InjectModel(MentoringImportBatchModel)
        private readonly batchModel: typeof MentoringImportBatchModel,
    ) {}

    private formatVn(value?: Date | string | null) {
        if (!value) return "";
        const date = new Date(new Date(value).getTime() + VN_OFFSET_MS);
        return `${pad2(date.getUTCDate())}/${pad2(date.getUTCMonth() + 1)}/${date.getUTCFullYear()} ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}`;
    }

    private parseVn(value: unknown): Date | null | "invalid" {
        if (value === null || value === undefined || text(value) === "")
            return null;
        if (typeof value === "number") {
            const parsed = XLSX.SSF.parse_date_code(value);
            if (!parsed) return "invalid";
            return new Date(
                Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M) -
                    VN_OFFSET_MS,
            );
        }
        const match =
            /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/.exec(
                text(value),
            );
        if (!match) return "invalid";
        const [day, month, year, hour, minute] = [
            Number(match[1]),
            Number(match[2]),
            Number(match[3]),
            Number(match[4] ?? 0),
            Number(match[5] ?? 0),
        ];
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

    private vnMonth(date: Date) {
        const local = new Date(date.getTime() + VN_OFFSET_MS);
        return { year: local.getUTCFullYear(), month: local.getUTCMonth() + 1 };
    }

    /** Xuất mẫu chuẩn (kèm dữ liệu đang có của quý, nếu có) */
    async exportQuarter(
        code: string,
    ): Promise<{ fileName: string; buffer: Buffer }> {
        const ref = parseQuarterCode(code);
        if (!ref)
            throw ApiError.BadRequest("error-mentoring-quarter-not-found", {
                code,
            });
        const quarterCode = `${ref.year}Q${ref.quarter}`;
        const rows: unknown[][] = [
            [
                MARKER,
                quarterCode,
                "Mỗi dòng là 1 buổi mentoring theo tháng. Không sửa 2 dòng đầu.",
            ],
            HEADERS,
        ];
        const board = await this.flowService
            .getQuarterBoard(quarterCode)
            .catch(() => null);
        for (const session of (board?.sessions ?? [])
            .filter((item) => item.status !== "CANCELLED")
            .sort(
                (a, b) => a.month - b.month || a.code.localeCompare(b.code),
            )) {
            const mentor = session.recaps.mentor;
            const mentee = session.recaps.mentee;
            rows.push([
                session.code,
                `${pad2(session.month)}/${session.year}`,
                session.mentor?.memberCode ?? "",
                session.mentor?.fullName ?? "",
                session.mentee?.memberCode ?? "",
                session.mentee?.fullName ?? "",
                this.formatVn(session.schedule?.startAt),
                this.formatVn(session.schedule?.endAt),
                mentor?.content ?? "",
                this.formatVn(mentor?.firstSubmittedAt),
                mentor
                    ? ((
                          {
                              APPROVED: "Duyệt",
                              REJECTED: "Không duyệt",
                          } as Record<string, string>
                      )[mentor.reviewStatus] ?? "")
                    : "",
                mentee?.content ?? "",
                this.formatVn(mentee?.firstSubmittedAt),
                mentee?.score ?? "",
            ]);
        }
        const sheet = XLSX.utils.aoa_to_sheet(rows);
        for (const key of Object.keys(sheet)) {
            if (!key.startsWith("!") && sheet[key].t !== "s") {
                sheet[key].t = "s";
                sheet[key].v = String(sheet[key].v ?? "");
            }
        }
        sheet["!cols"] = [
            24, 10, 15, 22, 15, 22, 20, 20, 40, 20, 16, 40, 20, 14,
        ].map((wch) => ({ wch }));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, sheet, "MENTORING_QUY_CU");
        return {
            fileName: `hlc-mentoring-quy-cu-${quarterCode}.xlsx`,
            buffer: XLSX.write(workbook, {
                type: "buffer",
                bookType: "xlsx",
            }) as Buffer,
        };
    }

    /**
     * Nhập quý cũ: kiểm tra toàn bộ file trước (mẫu, mã MTO/MTE, cặp, tháng, giờ, trùng lặp);
     * có lỗi thì không ghi gì. dryRun = true chỉ trả bản xem trước.
     * Dữ liệu nhập không tự tính lại điểm (điểm đã chốt không đổi); admin chủ động bấm "Tính lại" nếu cần.
     */
    async importQuarter(
        code: string,
        buffer: Buffer,
        fileName: string,
        user: User,
        options: { dryRun: boolean; reason?: string },
    ) {
        const ref = parseQuarterCode(code);
        if (!ref)
            throw ApiError.BadRequest("error-mentoring-quarter-not-found", {
                code,
            });
        const quarterCode = `${ref.year}Q${ref.quarter}`;
        let workbook: XLSX.WorkBook;
        try {
            workbook = XLSX.read(buffer, { type: "buffer" });
        } catch {
            throw ApiError.BadRequest("error-import-file-invalid");
        }
        const sheet =
            workbook.Sheets["MENTORING_QUY_CU"] ??
            workbook.Sheets[workbook.SheetNames[0]];
        const rows = sheet
            ? XLSX.utils.sheet_to_json<unknown[]>(sheet, {
                  header: 1,
                  raw: true,
                  defval: "",
              })
            : [];
        const fail = (message: string) => ({
            valid: false,
            applied: false,
            errors: [{ row: 1, message }],
            rows: [] as PlannedRow[],
            batchId: null as string | null,
        });
        if (
            text(rows[0]?.[0]) !== MARKER ||
            HEADERS.some((header, index) => text(rows[1]?.[index]) !== header)
        ) {
            return fail(
                "File không đúng mẫu dữ liệu mentoring quý cũ. Hãy xuất file mẫu rồi điền vào.",
            );
        }
        if (text(rows[0]?.[1]).toUpperCase() !== quarterCode)
            return fail(
                `File là quý ${text(rows[0]?.[1])}, không phải quý ${quarterCode}`,
            );

        const months = quarterMonths(ref);
        const members = new Map(
            (await this.memberModel.findAll({ raw: true })).map((member) => [
                member.memberCode.toUpperCase(),
                member,
            ]),
        );
        const existingQuarter = await this.flowService
            .getQuarterOrFail(quarterCode)
            .catch(() => null);
        const existingPairs = existingQuarter
            ? await this.pairModel.findAll({
                  where: { quarterId: existingQuarter._id },
                  raw: true,
              })
            : [];
        const existingSessions = existingPairs.length
            ? await this.sessionModel.findAll({
                  where: { pairId: existingPairs.map((pair) => pair._id) },
                  raw: true,
              })
            : [];
        const existingRecaps = existingSessions.length
            ? await this.recapModel.findAll({
                  where: {
                      sessionId: existingSessions.map((item) => item._id),
                  },
                  raw: true,
              })
            : [];
        const errors: { row: number; message: string }[] = [];
        const planned: PlannedRow[] = [];
        const mentorOfMentee = new Map<string, string>();
        const seen = new Set<string>();
        for (let index = 2; index < rows.length; index += 1) {
            const row = rows[index];
            const line = index + 1;
            if (!row || row.every((cell) => text(cell) === "")) continue;
            const err = (message: string) =>
                errors.push({ row: line, message });
            const monthMatch = /^(\d{1,2})\/(\d{4})$/.exec(text(row[1]));
            const month = monthMatch ? Number(monthMatch[1]) : NaN;
            if (
                !monthMatch ||
                Number(monthMatch[2]) !== ref.year ||
                !months.includes(month)
            ) {
                err(`Tháng "${text(row[1])}" không thuộc quý ${quarterCode}`);
                continue;
            }
            const mentorCode = text(row[2]).toUpperCase();
            const menteeCode = text(row[4]).toUpperCase();
            const mentor = members.get(mentorCode);
            const mentee = members.get(menteeCode);
            if (!mentor || mentor.memberType !== MemberType.MENTOR) {
                err(`Mã MTO "${mentorCode}" không tồn tại`);
                continue;
            }
            if (!mentee || mentee.memberType !== MemberType.MENTEE) {
                err(`Mã MTE "${menteeCode}" không tồn tại`);
                continue;
            }
            const key = `${menteeCode}|${month}`;
            if (seen.has(key)) {
                err(`${menteeCode} có 2 dòng cho tháng ${month}`);
                continue;
            }
            seen.add(key);
            // 1 MTE chỉ 1 cặp trong quý
            const pairedWith =
                mentorOfMentee.get(menteeCode) ??
                existingPairs.find(
                    (pair) =>
                        pair.menteeId === mentee._id &&
                        pair.status !== "CANCELLED",
                )?.mentorId;
            if (
                pairedWith &&
                pairedWith !== mentorCode &&
                pairedWith !== mentor._id
            ) {
                err(
                    `${menteeCode} đã ghép với MTO khác trong quý ${quarterCode}`,
                );
                continue;
            }
            mentorOfMentee.set(menteeCode, mentorCode);
            // Chống trùng: buổi đã có lịch hoặc recap thì không nhập đè
            const pair = existingPairs.find(
                (item) =>
                    item.menteeId === mentee._id &&
                    item.mentorId === mentor._id,
            );
            const session =
                pair &&
                existingSessions.find(
                    (item) =>
                        item.pairId === pair._id &&
                        item.monthIndex === months.indexOf(month) + 1,
                );
            if (
                session &&
                (session.scheduledStartAt ||
                    existingRecaps.some(
                        (recap) => recap.sessionId === session._id,
                    ))
            ) {
                err(
                    `Buổi ${session.code} đã có dữ liệu trên hệ thống, không nhập trùng`,
                );
                continue;
            }
            const startAt = this.parseVn(row[6]);
            const endAt = this.parseVn(row[7]);
            if (startAt === "invalid" || endAt === "invalid") {
                err("Giờ mentoring phải có dạng dd/MM/yyyy HH:mm");
                continue;
            }
            if (Boolean(startAt) !== Boolean(endAt)) {
                err("Cần cả giờ bắt đầu và kết thúc");
                continue;
            }
            if (startAt && endAt) {
                const local = this.vnMonth(startAt);
                if (
                    endAt <= startAt ||
                    local.month !== month ||
                    local.year !== ref.year
                ) {
                    err(
                        `Giờ mentoring phải nằm trong tháng ${pad2(month)}/${ref.year} và kết thúc sau bắt đầu`,
                    );
                    continue;
                }
            }
            const parseRecap = (
                contentIndex: number,
                dateIndex: number,
                label: string,
            ) => {
                const content = text(row[contentIndex]);
                if (!content) return null;
                if (!startAt)
                    throw new Error(`Recap ${label} cần có giờ mentoring`);
                const submittedAt = this.parseVn(row[dateIndex]);
                if (!submittedAt || submittedAt === "invalid")
                    throw new Error(
                        `Ngày nộp recap ${label} phải có dạng dd/MM/yyyy HH:mm`,
                    );
                return { content, submittedAt };
            };
            try {
                const mentorRecap = parseRecap(8, 9, "MTO");
                const menteeRecap = parseRecap(11, 12, "MTE");
                const reviewText = text(row[10]).toLowerCase();
                const review = !reviewText
                    ? "PENDING"
                    : reviewText === "duyệt"
                      ? "APPROVED"
                      : reviewText === "không duyệt"
                        ? "REJECTED"
                        : null;
                if (mentorRecap && !review)
                    throw new Error(
                        'Cột duyệt recap MTO chỉ nhận "Duyệt", "Không duyệt" hoặc để trống',
                    );
                const scoreText = text(row[13]);
                const score =
                    scoreText === ""
                        ? null
                        : Number(scoreText.replace(",", "."));
                if (
                    score !== null &&
                    (!Number.isFinite(score) || score < 0 || score > 100)
                )
                    throw new Error("Điểm recap MTE phải từ 0 đến 100");
                if (score !== null && !menteeRecap)
                    throw new Error("Có điểm nhưng thiếu nội dung recap MTE");
                planned.push({
                    row: line,
                    month,
                    mentorCode,
                    menteeCode,
                    mentorName: mentor.fullName,
                    menteeName: mentee.fullName,
                    startAt,
                    endAt,
                    mentorRecap: mentorRecap && { ...mentorRecap, review },
                    menteeRecap: menteeRecap && { ...menteeRecap, score },
                });
            } catch (error) {
                err((error as Error).message);
            }
        }
        if (!planned.length && !errors.length)
            errors.push({ row: 3, message: "File không có dòng dữ liệu nào" });
        if (errors.length || options.dryRun)
            return {
                valid: !errors.length,
                applied: false,
                errors,
                rows: planned,
                batchId: null as string | null,
            };
        const batchId = await this.apply(
            quarterCode,
            planned,
            fileName,
            user,
            options.reason,
        );
        return { valid: true, applied: true, errors, rows: planned, batchId };
    }

    private async apply(
        quarterCode: string,
        planned: PlannedRow[],
        fileName: string,
        user: User,
        reason?: string,
    ) {
        return this.sequelize.transaction(async (t) => {
            const quarterView = await this.flowService.ensureQuarter(
                quarterCode,
                user,
                t,
                true,
            );
            const quarter = await this.quarterModel.findOne({
                where: { code: quarterView.code },
                raw: true,
                transaction: t,
            });
            const batch = await this.batchModel.create(
                {
                    quarterCode,
                    fileName,
                    reason: reason?.trim() || null,
                    createdBy: user._id,
                    created: {},
                },
                { transaction: t },
            );
            const proxyReason = `Nhập dữ liệu quý cũ (${fileName})${reason?.trim() ? `: ${reason.trim()}` : ""}`;
            const pairIds: string[] = [];
            const createdSessionIds: string[] = [];
            const scheduledSessionIds: string[] = [];
            const recapIds: string[] = [];
            const now = new Date();
            const firstMonth = new Map<string, number>();
            planned.forEach((row) =>
                firstMonth.set(
                    row.menteeCode,
                    Math.min(firstMonth.get(row.menteeCode) ?? 99, row.month),
                ),
            );
            for (const [menteeCode, month] of firstMonth) {
                const row = planned.find(
                    (item) => item.menteeCode === menteeCode,
                );
                const before = await this.pairModel.findOne({
                    where: {
                        quarterId: quarter._id,
                        menteeId: (
                            await this.memberModel.findOne({
                                where: { memberCode: menteeCode },
                                raw: true,
                                transaction: t,
                            })
                        )._id,
                    },
                    raw: true,
                    transaction: t,
                });
                const sessionsBefore = before
                    ? (
                          await this.sessionModel.findAll({
                              where: { pairId: before._id },
                              attributes: ["_id"],
                              raw: true,
                              transaction: t,
                          })
                      ).map((item) => item._id)
                    : [];
                const result = await this.flowService.createPairInTransaction(
                    quarter,
                    { mentorCode: row.mentorCode, menteeCode, month },
                    user,
                    MentoringPairSource.IMPORT,
                    null,
                    t,
                );
                if (!before) pairIds.push(result.pair._id);
                const sessionsAfter = await this.sessionModel.findAll({
                    where: { pairId: result.pair._id },
                    attributes: ["_id"],
                    raw: true,
                    transaction: t,
                });
                createdSessionIds.push(
                    ...sessionsAfter
                        .map((item) => item._id)
                        .filter((id) => !sessionsBefore.includes(id)),
                );
            }
            const months = quarterMonths(quarter);
            for (const row of planned) {
                const mentee = await this.memberModel.findOne({
                    where: { memberCode: row.menteeCode },
                    raw: true,
                    transaction: t,
                });
                const pair = await this.pairModel.findOne({
                    where: { quarterId: quarter._id, menteeId: mentee._id },
                    raw: true,
                    transaction: t,
                });
                const session = await this.sessionModel.findOne({
                    where: {
                        pairId: pair._id,
                        monthIndex: months.indexOf(row.month) + 1,
                    },
                    raw: true,
                    transaction: t,
                });
                if (!row.startAt) continue;
                const deadline = recapDeadlineOf(row.endAt ?? row.startAt);
                await this.sessionModel.update(
                    {
                        scheduledStartAt: row.startAt,
                        scheduledEndAt: row.endAt,
                        firstScheduledStartAt: row.startAt,
                        recapDeadlineAt: deadline,
                        scheduleSubmittedAt: now,
                        scheduleNote: "Nhập dữ liệu quý cũ",
                    },
                    { where: { _id: session._id }, transaction: t },
                );
                if (!createdSessionIds.includes(session._id))
                    scheduledSessionIds.push(session._id);
                await this.scheduleLogModel.create(
                    {
                        sessionId: session._id,
                        action: ScheduleLogAction.ADMIN_OVERRIDE,
                        newStartAt: row.startAt,
                        newEndAt: row.endAt,
                        actorUserId: user._id,
                        reason: proxyReason,
                    },
                    { transaction: t },
                );
                const base = {
                    sessionId: session._id,
                    proxyBy: user._id,
                    proxyAt: now,
                    proxyReason,
                    importBatchId: batch._id,
                };
                if (row.mentorRecap) {
                    const recap = await this.recapModel.create(
                        {
                            ...base,
                            memberId: pair.mentorId,
                            role: MentoringRole.MENTOR,
                            content: row.mentorRecap.content,
                            firstSubmittedAt: row.mentorRecap.submittedAt,
                            lastSubmittedAt: row.mentorRecap.submittedAt,
                            initialSubmittedAt: row.mentorRecap.submittedAt,
                            isLate: row.mentorRecap.submittedAt > deadline,
                            reviewStatus: row.mentorRecap.review,
                            ...(row.mentorRecap.review !== "PENDING" && {
                                reviewedBy: user._id,
                                reviewedAt: now,
                            }),
                            ...(row.mentorRecap.review === "REJECTED" && {
                                reviewNote: "Không duyệt (dữ liệu quý cũ)",
                            }),
                        },
                        { transaction: t },
                    );
                    recapIds.push(recap._id);
                }
                if (row.menteeRecap) {
                    const scored = row.menteeRecap.score !== null;
                    const recap = await this.recapModel.create(
                        {
                            ...base,
                            memberId: pair.menteeId,
                            role: MentoringRole.MENTEE,
                            content: row.menteeRecap.content,
                            firstSubmittedAt: row.menteeRecap.submittedAt,
                            lastSubmittedAt: row.menteeRecap.submittedAt,
                            initialSubmittedAt: row.menteeRecap.submittedAt,
                            isLate: row.menteeRecap.submittedAt > deadline,
                            reviewStatus: scored
                                ? RecapReviewStatus.APPROVED
                                : RecapReviewStatus.PENDING,
                            ...(scored && {
                                reviewedBy: user._id,
                                reviewedAt: now,
                                score: row.menteeRecap.score,
                                scoreFeedback: "Điểm nhập từ dữ liệu quý cũ",
                                scoredBy: user._id,
                                scoredAt: now,
                            }),
                        },
                        { transaction: t },
                    );
                    recapIds.push(recap._id);
                }
            }
            await batch.update(
                {
                    created: {
                        pairIds,
                        sessionIds: scheduledSessionIds,
                        createdSessionIds,
                        recapIds,
                        rows: planned.length,
                    },
                },
                { transaction: t },
            );
            return batch._id;
        });
    }

    async listBatches() {
        const rows = await this.batchModel.findAll({
            order: [["createdAt", "DESC"]],
            limit: 100,
            raw: true,
        });
        return rows;
    }

    /** Hoàn tác cả lô: xóa recap, lịch và cặp do lô tạo ra (nhật ký lịch vẫn giữ, có thêm dòng hoàn tác) */
    async revertBatch(id: string, user: User) {
        const batch = await this.batchModel.findByPk(id);
        if (!batch) throw ApiError.NotFound("error-record-not-found");
        if (batch.status !== "ACTIVE")
            throw ApiError.Conflict("error-import-batch-reverted");
        const created = (batch.created ?? {}) as {
            pairIds?: string[];
            sessionIds?: string[];
            createdSessionIds?: string[];
            recapIds?: string[];
        };
        await this.sequelize.transaction(async (t) => {
            if (created.recapIds?.length)
                await this.recapModel.destroy({
                    where: { _id: created.recapIds },
                    transaction: t,
                });
            for (const sessionId of created.sessionIds ?? []) {
                await this.sessionModel.update(
                    {
                        scheduledStartAt: null,
                        scheduledEndAt: null,
                        firstScheduledStartAt: null,
                        recapDeadlineAt: null,
                        scheduleSubmittedAt: null,
                        scheduleNote: null,
                    },
                    { where: { _id: sessionId }, transaction: t },
                );
                await this.scheduleLogModel.create(
                    {
                        sessionId,
                        action: ScheduleLogAction.CANCEL,
                        actorUserId: user._id,
                        reason: `Hoàn tác lô nhập ${batch._id}`,
                    },
                    { transaction: t },
                );
            }
            if (created.createdSessionIds?.length)
                await this.sessionModel.destroy({
                    where: { _id: created.createdSessionIds },
                    transaction: t,
                });
            if (created.pairIds?.length) {
                await this.sessionModel.destroy({
                    where: { pairId: created.pairIds },
                    transaction: t,
                });
                await this.pairModel.destroy({
                    where: { _id: created.pairIds },
                    transaction: t,
                });
            }
            await batch.update(
                {
                    status: "REVERTED",
                    revertedBy: user._id,
                    revertedAt: new Date(),
                },
                { transaction: t },
            );
        });
        return batch.get({ plain: true });
    }
}
