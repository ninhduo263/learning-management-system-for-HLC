import { StrObjectId } from "@common/constant";
import { NumberColumn } from "@common/decorator/sql-column.decorator";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";
import { FundContributionStatus } from "../common/constant";
import { FundContribution } from "../entities/fund-contribution.entity";

@Table({ tableName: Entity.FUND_CONTRIBUTION })
export class FundContributionModel extends Model implements FundContribution {
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    memberId: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    periodId: string;

    @Column({ type: DataType.DATEONLY, allowNull: false })
    contributionDate: string;

    @NumberColumn({ type: DataType.DECIMAL(14, 2), allowNull: false })
    amount: number;

    @Column({ type: DataType.TEXT, allowNull: true })
    note?: string;

    @Column({ type: DataType.DATE, allowNull: false })
    submittedAt: Date;

    @Column({
        type: DataType.STRING,
        validate: { isIn: [Object.values(FundContributionStatus)] },
        allowNull: false,
        defaultValue: FundContributionStatus.PENDING,
    })
    status?: FundContributionStatus;

    @Column({ type: DataType.STRING(24), allowNull: true })
    reviewedBy?: string;

    @Column({ type: DataType.DATE, allowNull: true })
    reviewedAt?: Date;

    @Column({ type: DataType.TEXT, allowNull: true })
    reviewNote?: string;
}
