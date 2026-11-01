import { vnParts } from "@common/utils/vn-date.util";
import { PeriodStatus } from "@module/period/common/constant";
import { PeriodModel } from "@module/period/models/period.model";
import { TimeService } from "@module/time/time.service";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Op, Transaction } from "sequelize";
import { BankAccountHistoryModel } from "../models/bank-account-history.model";
import { MemberModel } from "../models/member.model";

export interface BankInfo {
    bankAccount: string | null;
    bankCode: string | null;
    bankName: string | null;
}

const BASELINE = "0000-00";
const pad = (value: number) => String(value).padStart(2, "0");
const nextCode = (code: string) => {
    const [year, month] = code.split("-").map(Number);
    return month === 12 ? `${year + 1}-01` : `${year}-${pad(month + 1)}`;
};

/**
 * Thông tin ngân hàng có hiệu lực theo kỳ phụ cấp. Thay đổi được duyệt trong khoảng từ lúc chốt kỳ đến lúc chi
 * (kỳ đã chốt, chưa chi) chỉ áp dụng từ kỳ sau, để không chi nhầm tài khoản của kỳ đang chờ chi.
 */
@Injectable()
export class BankHistoryService {
    constructor(
        private readonly timeService: TimeService,
        @InjectModel(BankAccountHistoryModel)
        private readonly historyModel: typeof BankAccountHistoryModel,
        @InjectModel(PeriodModel)
        private readonly periodModel: typeof PeriodModel,
        @InjectModel(MemberModel)
        private readonly memberModel: typeof MemberModel,
    ) {}

    /** Kỳ bắt đầu áp dụng cho thay đổi ngân hàng duyệt lúc này */
    async effectivePeriodCode(t?: Transaction) {
        const now = vnParts(this.timeService.now());
        const current = `${now.year}-${pad(now.month)}`;
        const waiting = await this.periodModel.findAll({
            where: { status: [PeriodStatus.LOCKED, PeriodStatus.EXPORTED] },
            attributes: ["code"],
            raw: true,
            transaction: t,
        });
        const latest = waiting
            .map((row) => row.code)
            .sort()
            .pop();
        if (latest && latest >= current) return nextCode(latest);
        return current;
    }

    /** Ghi thay đổi ngân hàng đã thành chính thức (lần đầu: lưu thông tin cũ làm mốc) */
    async record(
        memberId: string,
        before: BankInfo,
        after: BankInfo,
        source: "APPROVAL" | "ADMIN",
        options: { userId?: string; requestId?: string; t?: Transaction },
    ) {
        const effective = await this.effectivePeriodCode(options.t);
        const count = await this.historyModel.count({
            where: { memberId },
            transaction: options.t,
        });
        if (!count && (before.bankAccount || before.bankName))
            await this.historyModel.create(
                {
                    memberId,
                    ...before,
                    effectivePeriodCode: BASELINE,
                    source: "BASELINE",
                },
                { transaction: options.t },
            );
        await this.historyModel.create(
            {
                memberId,
                ...after,
                effectivePeriodCode: effective,
                source,
                requestId: options.requestId ?? null,
                createdBy: options.userId ?? null,
            },
            { transaction: options.t },
        );
        return effective;
    }

    /** Thông tin ngân hàng áp dụng cho từng thành viên ở kỳ periodCode */
    async bankFor(memberIds: string[], periodCode: string, t?: Transaction) {
        const result = new Map<string, BankInfo>();
        if (!memberIds.length) return result;
        const rows = await this.historyModel.findAll({
            where: {
                memberId: memberIds,
                effectivePeriodCode: { [Op.lte]: periodCode },
            },
            order: [
                ["effectivePeriodCode", "ASC"],
                ["createdAt", "ASC"],
            ],
            raw: true,
            transaction: t,
        });
        for (const row of rows)
            result.set(row.memberId, {
                bankAccount: row.bankAccount ?? null,
                bankCode: row.bankCode ?? null,
                bankName: row.bankName ?? null,
            });
        const missing = memberIds.filter((id) => !result.has(id));
        if (missing.length) {
            // Chưa từng đổi (hoặc thay đổi chỉ áp dụng từ kỳ sau): mốc cũ nếu có, không thì hồ sơ hiện tại
            const baselines = await this.historyModel.findAll({
                where: { memberId: missing, effectivePeriodCode: BASELINE },
                raw: true,
                transaction: t,
            });
            const members = await this.memberModel.findAll({
                where: { _id: missing },
                attributes: ["_id", "bankAccount", "bankCode", "bankName"],
                raw: true,
                transaction: t,
            });
            const hasHistory = new Set(
                (
                    await this.historyModel.findAll({
                        where: { memberId: missing },
                        attributes: ["memberId"],
                        raw: true,
                        transaction: t,
                    })
                ).map((row) => row.memberId),
            );
            for (const member of members) {
                const baseline = baselines.find(
                    (row) => row.memberId === member._id,
                );
                result.set(
                    member._id,
                    baseline
                        ? {
                              bankAccount: baseline.bankAccount ?? null,
                              bankCode: baseline.bankCode ?? null,
                              bankName: baseline.bankName ?? null,
                          }
                        : hasHistory.has(member._id)
                          ? {
                                bankAccount: null,
                                bankCode: null,
                                bankName: null,
                            }
                          : {
                                bankAccount: member.bankAccount ?? null,
                                bankCode: member.bankCode ?? null,
                                bankName: member.bankName ?? null,
                            },
                );
            }
        }
        return result;
    }
}
