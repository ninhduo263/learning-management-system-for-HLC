import { StrObjectId } from "@common/constant";
import { NumberColumn } from "@common/decorator/sql-column.decorator";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";
import { PointAdjustmentKind, PointAdjustmentStatus } from "../common/constant";
import { PointAdjustment } from "../entities/point-adjustment.entity";

@Table({ tableName: Entity.POINT_ADJUSTMENT })
export class PointAdjustmentModel extends Model implements PointAdjustment {
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    periodId: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    memberId: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    pointTypeId: string;

    @Column({
        type: DataType.STRING,
        validate: { isIn: [Object.values(PointAdjustmentKind)] },
        allowNull: false,
    })
    kind: PointAdjustmentKind;

    @NumberColumn({ type: DataType.DECIMAL(6, 2), allowNull: false })
    points: number;

    @Column({ type: DataType.TEXT, allowNull: false })
    reason: string;

    @Column({ type: DataType.STRING(24), allowNull: true })
    relatedEntryId?: string;

    @Column({
        type: DataType.STRING,
        validate: { isIn: [Object.values(PointAdjustmentStatus)] },
        allowNull: false,
        defaultValue: PointAdjustmentStatus.PENDING,
    })
    status?: PointAdjustmentStatus;

    @Column({ type: DataType.STRING(24), allowNull: true })
    requestedBy?: string;

    @Column({ type: DataType.STRING(24), allowNull: true })
    reviewedBy?: string;

    @Column({ type: DataType.DATE, allowNull: true })
    reviewedAt?: Date;

    @Column({ type: DataType.TEXT, allowNull: true })
    reviewNote?: string;
}
