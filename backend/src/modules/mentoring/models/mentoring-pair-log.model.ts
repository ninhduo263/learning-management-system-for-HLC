import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";

/** Nhật ký ghép / xóa cặp: ai làm, cặp nào, tháng nào, các tháng bị tác động, số bản ghi. Chỉ ghi thêm */
@Table({ tableName: Entity.MENTORING_PAIR_LOG, updatedAt: false })
export class MentoringPairLogModel extends Model {
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(10), allowNull: false })
    quarterCode: string;

    /** CREATE | DELETE | CHANGE */
    @Column({ type: DataType.STRING(10), allowNull: false })
    action: string;

    @Column({ type: DataType.STRING(50), allowNull: true })
    pairCode?: string;

    @Column({ type: DataType.STRING(20), allowNull: true })
    mentorCode?: string;

    @Column({ type: DataType.STRING(20), allowNull: true })
    menteeCode?: string;

    /** Tháng admin thao tác */
    @Column({ type: DataType.INTEGER, allowNull: false })
    fromMonth: number;

    /** { affectedMonths, skippedMonths, skippedReason, counts } */
    @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {} })
    detail: Record<string, unknown>;

    @Column({ type: DataType.STRING(24), allowNull: true })
    actorUserId?: string;
}
