import { StrObjectId } from "@common/constant";
import { NumberColumn } from "@common/decorator/sql-column.decorator";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";
import { FundContributionStatus, FundCycleType } from "../common/constant";
import { FundContribution } from "../entities/fund-contribution.entity";

@Table({ tableName: Entity.FUND_CONTRIBUTION })
export class FundContributionModel extends Model implements FundContribution {
    @StrObjectId()
    _id: string;

    /** Thành viên (MTO/MTE); null khi là thầy cô ngoài danh sách (contributorId) */
    @Column({ type: DataType.STRING(24), allowNull: true })
    memberId: string;

    /** Thầy cô ngoài danh sách MTO */
    @Column({ type: DataType.STRING(24), allowNull: true })
    contributorId?: string;

    @Column({
        type: DataType.STRING(10),
        allowNull: false,
        defaultValue: FundCycleType.ONCE,
    })
    cycleType?: FundCycleType;

    /** Khoản này đóng cho tới ngày (bao phủ các tuần từ ngày đóng đến ngày này) */
    @Column({ type: DataType.DATEONLY, allowNull: true })
    coverUntil?: string;

    /** Tài khoản đã gửi (người nộp hộ nếu isProxy) */
    @Column({ type: DataType.STRING(24), allowNull: true })
    submittedBy?: string;

    @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
    isProxy?: boolean;

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
