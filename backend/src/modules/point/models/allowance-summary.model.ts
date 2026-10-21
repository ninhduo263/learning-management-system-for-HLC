import { StrObjectId } from "@common/constant";
import { NumberColumn } from "@common/decorator/sql-column.decorator";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";
import { AllowanceSummaryStatus } from "../common/constant";
import { AllowanceSummary } from "../entities/allowance-summary.entity";

@Table({ tableName: Entity.ALLOWANCE_SUMMARY })
export class AllowanceSummaryModel extends Model implements AllowanceSummary {
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    periodId: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    memberId: string;

    @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {} })
    pointsByType?: Record<string, unknown>;

    @NumberColumn({
        type: DataType.DECIMAL(8, 2),
        allowNull: false,
        defaultValue: 0,
    })
    totalPoints?: number;

    @NumberColumn({
        type: DataType.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
    })
    pointRate?: number;

    @NumberColumn({
        type: DataType.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
    })
    baseAllowance?: number;

    @NumberColumn({
        type: DataType.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
    })
    amount?: number;

    @Column({
        type: DataType.STRING,
        validate: { isIn: [Object.values(AllowanceSummaryStatus)] },
        allowNull: false,
        defaultValue: AllowanceSummaryStatus.DRAFT,
    })
    status?: AllowanceSummaryStatus;

    @Column({ type: DataType.STRING(255), allowNull: true })
    fullNameSnapshot?: string;

    @Column({ type: DataType.STRING(50), allowNull: true })
    bankAccountSnapshot?: string;

    @Column({ type: DataType.STRING(255), allowNull: true })
    bankNameSnapshot?: string;

    @Column({ type: DataType.DATE, allowNull: false })
    calculatedAt: Date;

    @Column({ type: DataType.DATE, allowNull: true })
    lockedAt?: Date;

    @Column({ type: DataType.DATE, allowNull: true })
    paidAt?: Date;
}
