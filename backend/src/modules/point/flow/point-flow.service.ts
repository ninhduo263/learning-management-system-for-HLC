import { vnParts } from "@common/utils/vn-date.util";
import { ApiError } from "@config/exception/api-error";
import { MemberStatus } from "@module/member/common/constant";
import { Member } from "@module/member/entities/member.entity";
import { MemberModel } from "@module/member/models/member.model";
import { PeriodStatus } from "@module/period/common/constant";
import { Period } from "@module/period/entities/period.entity";
import { PeriodFlowService } from "@module/period/flow/period-flow.service";
import { PeriodModel } from "@module/period/models/period.model";
import { TimeService } from "@module/time/time.service";
import { User } from "@module/user/entities/user.entity";
import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Cron } from "@nestjs/schedule";
import { createHash } from "crypto";
import { Op, Transaction } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import * as XLSX from "xlsx";
import {
    AllowanceSummaryStatus,
    PeriodExportType,
    PointAdjustmentKind,
    PointAdjustmentStatus,
    PointEntryStatus,
    PointSourceType,
} from "../common/constant";
import { PointType } from "../entities/point-type.entity";
import { AllowanceSummaryModel } from "../models/allowance-summary.model";
import { PeriodExportModel } from "../models/period-export.model";
import { PointAdjustmentModel } from "../models/point-adjustment.model";
import { PointEntryModel } from "../models/point-entry.model";
import { PointTypeModel } from "../models/point-type.model";
import { PointCalculationService, stableId } from "./point-calculation.service";

export interface PeriodSettingsInput {
    pointRate?: number;
    baseAllowance?: number;
    payoutDate?: string;
}

export interface AdjustmentInput {
    memberId: string;
    pointTypeId?: string;
    points: number;
    reason: string;
    relatedEntryId?: string;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

@Injectable()
export class PointFlowService {
    private readonly logger = new Logger(PointFlowService.name);

    constructor(
        private readonly sequelize: Sequelize,
        private readonly timeService: TimeService,
        private readonly periodFlow: PeriodFlowService,
        private readonly calculation: PointCalculationService,
        @InjectModel(PeriodModel)
        private readonly periodModel: typeof PeriodModel,
        @InjectModel(PointTypeModel)
        private readonly pointTypeModel: typeof PointTypeModel,
        @InjectModel(PointEntryModel)
        private readonly entryModel: typeof PointEntryModel,
        @InjectModel(PointAdjustmentModel)
        private readonly adjustmentModel: typeof PointAdjustmentModel,
        @InjectModel(AllowanceSummaryModel)
        private readonly summaryModel: typeof AllowanceSummaryModel,
        @InjectModel(PeriodExportModel)
        private readonly exportModel: typeof PeriodExportModel,
        @InjectModel(MemberModel)
        private readonly memberModel: typeof MemberModel,
    ) {}

    // ------------------------------------------------------------------
    // Kỳ
    // ------------------------------------------------------------------

    private withLockFlag(period: Period) {
        return { ...period, isLocked: this.periodFlow.isLocked(period) };
    }

    async listPeriods() {
        const now = vnParts(this.timeService.now());
        await this.periodFlow.ensurePeriod(now.year, now.month);
        const periods = await this.periodModel.findAll({
            order: [["code", "DESC"]],
            raw: true,
        });
        return periods.map((period) => this.withLockFlag(period));
    }

    async ensurePeriod(code: string) {
        const [year, month] = code.split("-").map(Number);
        return this.withLockFlag(
            await this.periodFlow.ensurePeriod(year, month),
        );
    }

    async updateSettings(code: string, input: PeriodSettingsInput) {
        const period = await this.periodFlow.getByCode(code);
        this.periodFlow.assertWritable(period);
        await this.periodModel.update(
            {
                ...(input.pointRate !== undefined && {
                    pointRate: input.pointRate,
                }),
                ...(input.baseAllowance !== undefined && {
                    baseAllowance: input.baseAllowance,
                }),
                ...(input.payoutDate !== undefined && {
                    payoutDate: input.payoutDate,
                }),
            },
            { where: { _id: period._id } },
        );
        await this.sequelize.transaction((t) =>
            this.refreshSummaries(period._id, t),
        );
        return this.withLockFlag(await this.periodFlow.getByCode(code));
    }

    /** Tính lại điểm tự động + bảng tổng hợp của kỳ */
    async recalculate(code: string, user: Pick<User, "_id">) {
        return this.sequelize.transaction(async (t) => {
            const period = await this.periodFlow.getByCode(code, t);
            this.periodFlow.assertWritable(period);
            const result = await this.calculation.recalculate(
                period,
                user._id,
                t,
            );
            const members = await this.refreshSummaries(period._id, t);
            await this.periodModel.update(
                { status: PeriodStatus.REVIEWING },
                { where: { _id: period._id }, transaction: t },
            );
            return { ...result, members, calculatedAt: this.timeService.now() };
        });
    }

    /** Hằng ngày 01:00 giờ VN: tính lại kỳ hiện tại và kỳ trước (nếu chưa chốt) */
    @Cron("0 1 * * *", { timeZone: "Asia/Ho_Chi_Minh" })
    async autoRecalculate() {
        const now = vnParts(this.timeService.now());
        const previous =
            now.month === 1
                ? { year: now.year - 1, month: 12 }
                : { year: now.year, month: now.month - 1 };
        for (const item of [previous, now]) {
            try {
                const period = await this.periodFlow.ensurePeriod(
                    item.year,
                    item.month,
                );
                if (this.periodFlow.isLocked(period)) continue;
                await this.recalculate(period.code, { _id: null });
            } catch (error) {
                this.logger.error(
                    `Tự tính điểm kỳ ${item.year}-${item.month} lỗi: ${error}`,
                );
            }
        }
    }

    async lock(code: string, user: User) {
        return this.sequelize.transaction(async (t) => {
            const period = await this.periodFlow.getByCode(code, t);
            this.periodFlow.assertWritable(period);
            await this.refreshSummaries(period._id, t);
            const now = this.timeService.now();
            const members = new Map(
                (
                    await this.memberModel.findAll({
                        raw: true,
                        transaction: t,
                    })
                ).map((member) => [member._id, member]),
            );
            const summaries = await this.summaryModel.findAll({
                where: { periodId: period._id },
                transaction: t,
            });
            for (const summary of summaries) {
                const member = members.get(summary.memberId);
                await summary.update(
                    {
                        status: AllowanceSummaryStatus.LOCKED,
                        lockedAt: now,
                        fullNameSnapshot: member?.fullName,
                        bankAccountSnapshot: member?.bankAccount,
                        bankNameSnapshot: member?.bankName,
                    },
                    { transaction: t },
                );
            }
            await this.periodModel.update(
                {
                    status: PeriodStatus.LOCKED,
                    lockedAt: now,
                    lockedBy: user._id,
                },
                { where: { _id: period._id }, transaction: t },
            );
            return this.withLockFlag(await this.periodFlow.getByCode(code, t));
        });
    }

    async unlock(code: string) {
        const period = await this.periodFlow.getByCode(code);
        if (
            period.status === PeriodStatus.PAID ||
            !this.periodFlow.isLocked(period)
        ) {
            throw ApiError.Conflict(
                period.status === PeriodStatus.PAID
                    ? "error-period-locked"
                    : "error-period-not-locked",
                { code },
            );
        }
        await this.sequelize.transaction(async (t) => {
            await this.summaryModel.update(
                { status: AllowanceSummaryStatus.DRAFT, lockedAt: null },
                { where: { periodId: period._id }, transaction: t },
            );
            await this.periodModel.update(
                {
                    status: PeriodStatus.REVIEWING,
                    lockedAt: null,
                    lockedBy: null,
                },
                { where: { _id: period._id }, transaction: t },
            );
        });
        return this.withLockFlag(await this.periodFlow.getByCode(code));
    }

    async markPaid(code: string) {
        const period = await this.periodFlow.getByCode(code);
        if (!this.periodFlow.isLocked(period))
            throw ApiError.Conflict("error-period-not-locked", { code });
        const now = this.timeService.now();
        await this.sequelize.transaction(async (t) => {
            await this.summaryModel.update(
                { status: AllowanceSummaryStatus.PAID, paidAt: now },
                { where: { periodId: period._id }, transaction: t },
            );
            await this.periodModel.update(
                { status: PeriodStatus.PAID },
                { where: { _id: period._id }, transaction: t },
            );
        });
        return this.withLockFlag(await this.periodFlow.getByCode(code));
    }

    // ------------------------------------------------------------------
    // Tổng hợp
    // ------------------------------------------------------------------

    private async pointTypes(t?: Transaction) {
        return (await this.pointTypeModel.findAll({
            order: [
                ["sortOrder", "ASC"],
                ["code", "ASC"],
            ],
            raw: true,
            transaction: t,
        })) as PointType[];
    }

    /** Tạo lại AllowanceSummary (nháp) từ các PointEntry ACTIVE của kỳ */
    async refreshSummaries(periodId: string, t: Transaction) {
        const period = await this.periodModel.findByPk(periodId, {
            raw: true,
            transaction: t,
        });
        if (this.periodFlow.isLocked(period)) return 0;
        const types = new Map(
            (await this.pointTypes(t)).map((type) => [type._id, type]),
        );
        const entries = await this.entryModel.findAll({
            where: { periodId, status: PointEntryStatus.ACTIVE },
            raw: true,
            transaction: t,
        });
        const activeMembers = await this.memberModel.findAll({
            where: { status: { [Op.ne]: MemberStatus.INACTIVE } },
            attributes: ["_id"],
            raw: true,
            transaction: t,
        });
        const byMember = new Map<string, Record<string, number>>();
        activeMembers.forEach((member) => byMember.set(member._id, {}));
        for (const entry of entries) {
            const type = types.get(entry.pointTypeId);
            if (type && type.isAllowance === false) continue;
            const key = type?.code ?? entry.pointTypeId;
            const bucket = byMember.get(entry.memberId) ?? {};
            bucket[key] = round2((bucket[key] ?? 0) + Number(entry.points));
            byMember.set(entry.memberId, bucket);
        }
        const now = this.timeService.now();
        const rate = Number(period.pointRate ?? 0);
        const base = Number(period.baseAllowance ?? 0);
        const existing = new Map(
            (
                await this.summaryModel.findAll({
                    where: { periodId },
                    transaction: t,
                })
            ).map((row) => [row.memberId, row]),
        );
        for (const [memberId, pointsByType] of byMember) {
            const totalPoints = round2(
                Object.values(pointsByType).reduce(
                    (sum, value) => sum + value,
                    0,
                ),
            );
            const values = {
                pointsByType,
                totalPoints,
                pointRate: rate,
                baseAllowance: base,
                amount: round2(base + totalPoints * rate),
                calculatedAt: now,
                status: AllowanceSummaryStatus.DRAFT,
            };
            const current = existing.get(memberId);
            if (current) await current.update(values, { transaction: t });
            else
                await this.summaryModel.create(
                    {
                        _id: stableId("SUMMARY", periodId, memberId),
                        periodId,
                        memberId,
                        ...values,
                    },
                    { transaction: t },
                );
            existing.delete(memberId);
        }
        // Thành viên không còn hoạt động và không có điểm: bỏ khỏi bảng
        for (const row of existing.values())
            await row.destroy({ transaction: t });
        return byMember.size;
    }

    async getSummary(code: string) {
        const period = await this.periodFlow.getByCode(code);
        const types = (await this.pointTypes()).filter(
            (type) => type.isAllowance !== false,
        );
        const summaries = await this.summaryModel.findAll({
            where: { periodId: period._id },
            raw: true,
        });
        const members = new Map(
            (
                await this.memberModel.findAll({
                    where: { _id: summaries.map((row) => row.memberId) },
                    raw: true,
                })
            ).map((member) => [member._id, member]),
        );
        const pending = await this.adjustmentModel.count({
            where: {
                periodId: period._id,
                status: PointAdjustmentStatus.PENDING,
            },
        });
        const rows = summaries
            .map((row) => {
                const member = members.get(row.memberId);
                return {
                    ...row,
                    totalPoints: Number(row.totalPoints),
                    amount: Number(row.amount),
                    member: member && {
                        _id: member._id,
                        memberCode: member.memberCode,
                        fullName: row.fullNameSnapshot ?? member.fullName,
                        memberType: member.memberType,
                        bankAccount:
                            row.bankAccountSnapshot ?? member.bankAccount,
                        bankName: row.bankNameSnapshot ?? member.bankName,
                        status: member.status,
                    },
                };
            })
            .sort(
                (a, b) =>
                    b.totalPoints - a.totalPoints ||
                    (a.member?.memberCode ?? "").localeCompare(
                        b.member?.memberCode ?? "",
                    ),
            );
        return {
            period: this.withLockFlag(period),
            pointTypes: types.map((type) => ({
                _id: type._id,
                code: type.code,
                name: type.name,
                category: type.category,
            })),
            rows,
            totals: {
                members: rows.length,
                points: round2(
                    rows.reduce((sum, row) => sum + row.totalPoints, 0),
                ),
                amount: round2(rows.reduce((sum, row) => sum + row.amount, 0)),
                pendingAdjustments: pending,
            },
        };
    }

    /** Drill-down: từng dòng điểm của 1 thành viên trong kỳ */
    async getBreakdown(code: string, memberId: string) {
        const period = await this.periodFlow.getByCode(code);
        const member = await this.memberModel.findByPk(memberId, { raw: true });
        if (!member) throw ApiError.NotFound("error-member-not-linked");
        return this.breakdownOf(period, member);
    }

    private async breakdownOf(period: Period, member: Member) {
        const types = new Map(
            (await this.pointTypes()).map((type) => [type._id, type]),
        );
        const entries = await this.entryModel.findAll({
            where: { periodId: period._id, memberId: member._id },
            order: [["createdAt", "ASC"]],
            raw: true,
        });
        const adjustments = await this.adjustmentModel.findAll({
            where: { periodId: period._id, memberId: member._id },
            order: [["createdAt", "DESC"]],
            raw: true,
        });
        const summary = await this.summaryModel.findOne({
            where: { periodId: period._id, memberId: member._id },
            raw: true,
        });
        return {
            period: this.withLockFlag(period),
            member: {
                _id: member._id,
                memberCode: member.memberCode,
                fullName: member.fullName,
                memberType: member.memberType,
            },
            summary,
            entries: entries.map((entry) => ({
                ...entry,
                points: Number(entry.points),
                pointType: types.get(entry.pointTypeId)
                    ? {
                          code: types.get(entry.pointTypeId).code,
                          name: types.get(entry.pointTypeId).name,
                      }
                    : null,
                isManual: entry.sourceType === PointSourceType.POINT_ADJUSTMENT,
            })),
            adjustments: adjustments.map((item) => ({
                ...item,
                points: Number(item.points),
                pointType: types.get(item.pointTypeId)
                    ? {
                          code: types.get(item.pointTypeId).code,
                          name: types.get(item.pointTypeId).name,
                      }
                    : null,
            })),
        };
    }

    // ------------------------------------------------------------------
    // Điều chỉnh / khiếu nại
    // ------------------------------------------------------------------

    private async defaultTypeId(points: number) {
        const code = points < 0 ? "MANUAL_PENALTY" : "MANUAL_BONUS";
        const type = await this.pointTypeModel.findOne({
            where: { code },
            raw: true,
        });
        if (!type) throw ApiError.NotFound("error-point-type-not-found");
        return type._id;
    }

    private async applyAdjustment(
        adjustment: PointAdjustmentModel,
        user: Pick<User, "_id">,
        t: Transaction,
    ) {
        await this.entryModel.upsert(
            {
                _id: stableId("ADJ", adjustment._id),
                periodId: adjustment.periodId,
                memberId: adjustment.memberId,
                pointTypeId: adjustment.pointTypeId,
                ruleId: null,
                points: adjustment.points,
                sourceType: PointSourceType.POINT_ADJUSTMENT,
                sourceId: adjustment._id,
                description: `${adjustment.kind === PointAdjustmentKind.APPEAL ? "Khiếu nại" : "Điều chỉnh"}: ${adjustment.reason}`,
                status: PointEntryStatus.ACTIVE,
                createdBy: user._id,
            },
            { transaction: t },
        );
        await this.refreshSummaries(adjustment.periodId, t);
    }

    /** Admin cộng/trừ điểm thủ công (áp dụng ngay) */
    async createAdjustment(code: string, input: AdjustmentInput, user: User) {
        return this.sequelize.transaction(async (t) => {
            const period = await this.periodFlow.getByCode(code, t);
            this.periodFlow.assertWritable(period);
            const member = await this.memberModel.findByPk(input.memberId, {
                raw: true,
                transaction: t,
            });
            if (!member) throw ApiError.NotFound("error-member-not-linked");
            const now = this.timeService.now();
            const adjustment = await this.adjustmentModel.create(
                {
                    periodId: period._id,
                    memberId: member._id,
                    pointTypeId:
                        input.pointTypeId ??
                        (await this.defaultTypeId(input.points)),
                    kind: PointAdjustmentKind.MANUAL,
                    points: input.points,
                    reason: input.reason,
                    relatedEntryId: input.relatedEntryId,
                    status: PointAdjustmentStatus.APPROVED,
                    requestedBy: user._id,
                    reviewedBy: user._id,
                    reviewedAt: now,
                },
                { transaction: t },
            );
            await this.applyAdjustment(adjustment, user, t);
            return adjustment.get({ plain: true });
        });
    }

    /** Thành viên gửi khiếu nại điểm (chờ admin duyệt) */
    async createAppeal(
        code: string,
        member: Member,
        input: Omit<AdjustmentInput, "memberId">,
        user: User,
    ) {
        const period = await this.periodFlow.getByCode(code);
        this.periodFlow.assertWritable(period);
        const adjustment = await this.adjustmentModel.create({
            periodId: period._id,
            memberId: member._id,
            pointTypeId:
                input.pointTypeId ?? (await this.defaultTypeId(input.points)),
            kind: PointAdjustmentKind.APPEAL,
            points: input.points,
            reason: input.reason,
            relatedEntryId: input.relatedEntryId,
            status: PointAdjustmentStatus.PENDING,
            requestedBy: user._id,
        });
        return adjustment.get({ plain: true });
    }

    async listAdjustments(code: string, status?: PointAdjustmentStatus) {
        const period = await this.periodFlow.getByCode(code);
        const rows = await this.adjustmentModel.findAll({
            where: { periodId: period._id, ...(status && { status }) },
            order: [["createdAt", "DESC"]],
            raw: true,
        });
        const members = new Map(
            (
                await this.memberModel.findAll({
                    where: { _id: rows.map((row) => row.memberId) },
                    raw: true,
                })
            ).map((member) => [member._id, member]),
        );
        const types = new Map(
            (await this.pointTypes()).map((type) => [type._id, type]),
        );
        return rows.map((row) => ({
            ...row,
            points: Number(row.points),
            member: members.get(row.memberId) && {
                _id: row.memberId,
                memberCode: members.get(row.memberId).memberCode,
                fullName: members.get(row.memberId).fullName,
            },
            pointType: types.get(row.pointTypeId)
                ? {
                      code: types.get(row.pointTypeId).code,
                      name: types.get(row.pointTypeId).name,
                  }
                : null,
        }));
    }

    async reviewAdjustment(
        id: string,
        approve: boolean,
        user: User,
        note?: string,
        points?: number,
    ) {
        return this.sequelize.transaction(async (t) => {
            const adjustment = await this.adjustmentModel.findByPk(id, {
                transaction: t,
            });
            if (!adjustment) throw ApiError.NotFound("error-record-not-found");
            if (adjustment.status !== PointAdjustmentStatus.PENDING)
                throw ApiError.Conflict("error-point-adjustment-reviewed");
            const period = await this.periodModel.findByPk(
                adjustment.periodId,
                { raw: true, transaction: t },
            );
            this.periodFlow.assertWritable(period);
            await adjustment.update(
                {
                    status: approve
                        ? PointAdjustmentStatus.APPROVED
                        : PointAdjustmentStatus.REJECTED,
                    reviewedBy: user._id,
                    reviewedAt: this.timeService.now(),
                    reviewNote: note,
                    ...(approve && points !== undefined && { points }),
                },
                { transaction: t },
            );
            if (approve) await this.applyAdjustment(adjustment, user, t);
            return adjustment.get({ plain: true });
        });
    }

    /** Hủy 1 điều chỉnh đã áp dụng (VOID dòng điểm tương ứng) */
    async cancelAdjustment(id: string, user: User) {
        return this.sequelize.transaction(async (t) => {
            const adjustment = await this.adjustmentModel.findByPk(id, {
                transaction: t,
            });
            if (!adjustment) throw ApiError.NotFound("error-record-not-found");
            const period = await this.periodModel.findByPk(
                adjustment.periodId,
                { raw: true, transaction: t },
            );
            this.periodFlow.assertWritable(period);
            await this.entryModel.update(
                {
                    status: PointEntryStatus.VOID,
                    voidReason: "Hủy điều chỉnh",
                    voidedAt: this.timeService.now(),
                    voidedBy: user._id,
                },
                {
                    where: {
                        sourceType: PointSourceType.POINT_ADJUSTMENT,
                        sourceId: adjustment._id,
                    },
                    transaction: t,
                },
            );
            await adjustment.update(
                {
                    status: PointAdjustmentStatus.REJECTED,
                    reviewNote: "Đã hủy",
                    reviewedBy: user._id,
                    reviewedAt: this.timeService.now(),
                },
                { transaction: t },
            );
            await this.refreshSummaries(adjustment.periodId, t);
            return adjustment.get({ plain: true });
        });
    }

    // ------------------------------------------------------------------
    // Xuất file chi trả
    // ------------------------------------------------------------------

    async exportAllowance(code: string, format: "xlsx" | "csv", user: User) {
        const summary = await this.getSummary(code);
        if (!summary.period.isLocked)
            throw ApiError.Conflict("error-period-not-locked", { code });
        const rows = summary.rows.map((row, index) => {
            const line: Record<string, string | number> = {
                STT: index + 1,
                "Mã HLC": row.member?.memberCode ?? "",
                "Họ và tên": row.member?.fullName ?? "",
                Loại: row.member?.memberType === "MENTOR" ? "Mentor" : "Mentee",
            };
            for (const type of summary.pointTypes)
                line[type.name] = Number(row.pointsByType?.[type.code] ?? 0);
            line["Tổng điểm"] = row.totalPoints;
            line["Đơn giá/điểm"] = Number(row.pointRate);
            line["Phụ cấp cơ bản"] = Number(row.baseAllowance);
            line["Thành tiền"] = row.amount;
            line["Số tài khoản"] = row.member?.bankAccount ?? "";
            line["Ngân hàng"] = row.member?.bankName ?? "";
            return line;
        });
        const sheet = XLSX.utils.json_to_sheet(rows);
        let buffer: Buffer;
        if (format === "csv") {
            buffer = Buffer.from("﻿" + XLSX.utils.sheet_to_csv(sheet), "utf8");
        } else {
            sheet["!cols"] = Object.keys(rows[0] ?? { STT: "" }).map((key) => ({
                wch: Math.max(10, key.length + 2),
            }));
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, sheet, `Phu cap ${code}`);
            buffer = XLSX.write(workbook, {
                type: "buffer",
                bookType: "xlsx",
            }) as Buffer;
        }
        const fileName = `hlc-phu-cap-${code}.${format}`;
        await this.exportModel.create({
            periodId: summary.period._id,
            exportType:
                format === "csv"
                    ? PeriodExportType.ALLOWANCE_CSV
                    : PeriodExportType.ALLOWANCE_XLSX,
            fileUrl: `/points/periods/${code}/export.${format}`,
            checksum: createHash("md5").update(buffer).digest("hex"),
            exportedBy: user._id,
            exportedAt: this.timeService.now(),
            note: `${rows.length} thành viên, tổng ${summary.totals.amount}`,
        });
        if (summary.period.status === PeriodStatus.LOCKED) {
            await this.periodModel.update(
                { status: PeriodStatus.EXPORTED },
                { where: { _id: summary.period._id } },
            );
        }
        return {
            fileName,
            buffer,
            contentType:
                format === "csv"
                    ? "text/csv; charset=utf-8"
                    : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        };
    }

    async listExports(code: string) {
        const period = await this.periodFlow.getByCode(code);
        return this.exportModel.findAll({
            where: { periodId: period._id },
            order: [["exportedAt", "DESC"]],
            raw: true,
        });
    }

    // ------------------------------------------------------------------
    // Của tôi
    // ------------------------------------------------------------------

    async getMine(member: Member, code?: string) {
        const now = vnParts(this.timeService.now());
        const period = code
            ? await this.periodFlow.getByCode(code)
            : await this.periodFlow.ensurePeriod(now.year, now.month);
        const detail = await this.breakdownOf(period, member);
        const history = await this.summaryModel.findAll({
            where: { memberId: member._id },
            raw: true,
        });
        const periods = new Map(
            (
                await this.periodModel.findAll({
                    where: { _id: history.map((row) => row.periodId) },
                    raw: true,
                })
            ).map((item) => [item._id, item]),
        );
        return {
            ...detail,
            entries: detail.entries.filter(
                (entry) => entry.status === PointEntryStatus.ACTIVE,
            ),
            history: history
                .map((row) => ({
                    periodCode: periods.get(row.periodId)?.code,
                    totalPoints: Number(row.totalPoints),
                    amount: Number(row.amount),
                    status: row.status,
                }))
                .sort((a, b) =>
                    (b.periodCode ?? "").localeCompare(a.periodCode ?? ""),
                ),
        };
    }
}
