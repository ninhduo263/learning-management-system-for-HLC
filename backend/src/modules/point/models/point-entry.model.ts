import { StrObjectId } from "@common/constant";
import { NumberColumn } from "@common/decorator/sql-column.decorator";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";
import { PointEntryStatus, PointSourceType } from "../common/constant";
import { PointEntry } from "../entities/point-entry.entity";

@Table({ tableName: Entity.POINT_ENTRY })
export class PointEntryModel extends Model implements PointEntry {
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    periodId: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    memberId: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    pointTypeId: string;

    @Column({ type: DataType.STRING(24), allowNull: true })
    ruleId?: string;

    @NumberColumn({ type: DataType.DECIMAL(6, 2), allowNull: false })
    points: number;

    @Column({
        type: DataType.STRING,
        validate: { isIn: [Object.values(PointSourceType)] },
        allowNull: false,
    })
    sourceType: PointSourceType;

    @Column({ type: DataType.STRING(24), allowNull: false })
    sourceId: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    description?: string;

    @Column({
        type: DataType.STRING,
        validate: { isIn: [Object.values(PointEntryStatus)] },
        allowNull: false,
        defaultValue: PointEntryStatus.ACTIVE,
    })
    status?: PointEntryStatus;

    @Column({ type: DataType.TEXT, allowNull: true })
    voidReason?: string;

    @Column({ type: DataType.STRING(24), allowNull: true })
    voidedBy?: string;

    @Column({ type: DataType.DATE, allowNull: true })
    voidedAt?: Date;

    @Column({ type: DataType.STRING(24), allowNull: true })
    createdBy?: string;
}
