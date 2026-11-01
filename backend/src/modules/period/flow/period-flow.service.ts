import { monthKey, pad2 } from "@common/utils/vn-date.util";
import { ApiError } from "@config/exception/api-error";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Op, Transaction } from "sequelize";
import { PeriodStatus } from "../common/constant";
import { Period } from "../entities/period.entity";
import { PeriodModel } from "../models/period.model";

/** Kỳ tháng dùng chung: mentoring, quỹ, bài nộp và điểm đều gắn vào kỳ */
@Injectable()
export class PeriodFlowService {
    constructor(
        @InjectModel(PeriodModel)
        private readonly periodModel: typeof PeriodModel,
    ) {}

    /** Lấy kỳ tháng, tạo mới nếu chưa có (chi trả mặc định ngày 10 tháng sau) */
    async ensurePeriod(
        year: number,
        month: number,
        transaction?: Transaction,
    ): Promise<Period> {
        const code = monthKey(year, month);
        const existing = await this.periodModel.findOne({
            where: { code },
            transaction,
            raw: true,
        });
        if (existing) return existing;
        const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
        const next =
            month === 12
                ? { year: year + 1, month: 1 }
                : { year, month: month + 1 };
        // Đơn giá điểm / phụ cấp cơ bản lấy theo kỳ gần nhất trước đó
        const previous = await this.periodModel.findOne({
            where: { code: { [Op.lt]: code } },
            order: [["code", "DESC"]],
            raw: true,
            transaction,
        });
        const [period] = await this.periodModel.findOrCreate({
            where: { code },
            defaults: {
                code,
                year,
                month,
                startDate: `${code}-01`,
                endDate: `${code}-${pad2(lastDay)}`,
                payoutDate: `${monthKey(next.year, next.month)}-10`,
                pointRate: previous?.pointRate ?? 0,
                baseAllowance: previous?.baseAllowance ?? 0,
            },
            transaction,
        });
        return period.get({ plain: true }) as Period;
    }

    async getByCode(code: string, transaction?: Transaction): Promise<Period> {
        const period = await this.periodModel.findOne({
            where: { code },
            raw: true,
            transaction,
        });
        if (!period)
            throw ApiError.NotFound("error-period-not-found", { code });
        return period;
    }

    async getById(id: string, transaction?: Transaction): Promise<Period> {
        const period = await this.periodModel.findByPk(id, {
            raw: true,
            transaction,
        });
        if (!period)
            throw ApiError.NotFound("error-period-not-found", { code: id });
        return period;
    }

    isLocked(period: Pick<Period, "status">) {
        return [
            PeriodStatus.LOCKED,
            PeriodStatus.EXPORTED,
            PeriodStatus.PAID,
        ].includes(period.status as PeriodStatus);
    }

    assertWritable(period: Period) {
        if (this.isLocked(period)) {
            throw ApiError.Conflict("error-period-locked", {
                code: period.code,
            });
        }
    }
}
