import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Column, DataType, Index, Model, Table } from "sequelize-typescript";

/**
 * Ủy quyền duyệt hộ / nộp hộ recap MTO do Trưởng ban Mentoring cấp (mặc định chỉ Admin toàn cục và
 * Trưởng ban Mentoring được làm). Có phạm vi (một cặp hoặc một nhóm MTE), thời hạn và lý do;
 * hết hạn thì tự mất hiệu lực.
 */
@Table({ tableName: Entity.RECAP_DELEGATION })
export class RecapDelegationModel extends Model {
    @StrObjectId()
    _id: string;

    /** Người nhận ủy quyền */
    @Index
    @Column({ type: DataType.STRING(24), allowNull: false })
    toMemberId: string;

    /** PAIR: cặp mentoring (scopeId = MentoringPair._id); GROUP: nhóm MTE (scopeId = id nhóm) */
    @Column({ type: DataType.STRING(10), allowNull: false })
    scopeType: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    scopeId: string;

    /** REVIEW (duyệt / không duyệt recap MTO), PROXY (nộp hộ recap MTO) */
    @Column({ type: DataType.JSONB, allowNull: false, defaultValue: [] })
    actions: string[];

    @Column({ type: DataType.DATEONLY, allowNull: false })
    startDate: string;

    @Column({ type: DataType.DATEONLY, allowNull: false })
    endDate: string;

    @Column({ type: DataType.TEXT, allowNull: false })
    reason: string;

    /** Người cấp ủy quyền (Trưởng ban Mentoring / Admin toàn cục) */
    @Column({ type: DataType.STRING(24), allowNull: false })
    grantedByUserId: string;

    @Column({ type: DataType.STRING(255), allowNull: false })
    grantedByName: string;

    @Column({ type: DataType.DATE, allowNull: true })
    revokedAt?: Date;

    @Column({ type: DataType.STRING(24), allowNull: true })
    revokedBy?: string;
}
