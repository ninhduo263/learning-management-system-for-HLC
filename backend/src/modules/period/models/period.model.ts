import { StrObjectId } from "@common/constant";
import { NumberColumn } from "@common/decorator/sql-column.decorator";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";
import { PeriodStatus } from "../common/constant";
import { Period } from "../entities/period.entity";

@Table({ tableName: Entity.PERIOD })
export class PeriodModel extends Model implements Period {
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(7), allowNull: false, unique: true })
    code: string;

    @Column({ type: DataType.SMALLINT, allowNull: false })
    year: number;

    @Column({ type: DataType.SMALLINT, allowNull: false })
    month: number;

    @Column({ type: DataType.DATEONLY, allowNull: false })
    startDate: string;

    @Column({ type: DataType.DATEONLY, allowNull: false })
    endDate: string;

    @Column({
        type: DataType.STRING,
        validate: { isIn: [Object.values(PeriodStatus)] },
        allowNull: false,
        defaultValue: PeriodStatus.OPEN,
    })
    status?: PeriodStatus;

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

    @Column({ type: DataType.DATEONLY, allowNull: true })
    payoutDate?: string;

    @Column({ type: DataType.DATE, allowNull: true })
    lockedAt?: Date;

    @Column({ type: DataType.STRING(24), allowNull: true })
    lockedBy?: string;

    /** Ngày chi thực tế (Xác nhận đã chi): mốc ghi khoản chi vào sổ quỹ */
    @Column({ type: DataType.DATEONLY, allowNull: true })
    paidDate?: string;

    @Column({ type: DataType.STRING(24), allowNull: true })
    paidBy?: string;
}
