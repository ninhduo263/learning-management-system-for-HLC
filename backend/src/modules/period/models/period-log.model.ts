import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";

/** Nhật ký thay đổi của kỳ phụ cấp (đơn giá, chốt, mở khóa, chi trả, bù chênh lệch). Chỉ ghi thêm */
@Table({ tableName: Entity.PERIOD_LOG, updatedAt: false })
export class PeriodLogModel extends Model {
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    periodId: string;

    /** SETTINGS | LOCK | UNLOCK | PAID | EXPORT | CARRY_OVER */
    @Column({ type: DataType.STRING(20), allowNull: false })
    action: string;

    @Column({ type: DataType.STRING(50), allowNull: true })
    field?: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    oldValue?: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    newValue?: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    reason?: string;

    @Column({ type: DataType.STRING(24), allowNull: true })
    changedBy?: string;
}
