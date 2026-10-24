import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Column, DataType, Index, Model, Table } from "sequelize-typescript";
import { ProposalStatus } from "../common/constant";

/** Một đề xuất giữa các chức vụ. Không xóa: là lịch sử đề xuất và kết quả duyệt */
@Table({ tableName: Entity.PROPOSAL })
export class ProposalModel extends Model {
    @StrObjectId()
    _id: string;

    @Index
    @Column({ type: DataType.STRING(20), allowNull: false })
    type: string;

    @Index
    @Column({
        type: DataType.STRING(12),
        allowNull: false,
        defaultValue: ProposalStatus.PENDING,
    })
    status: string;

    /** Chức vụ nắm quyền quyết định: MENTORING | FUND (để lọc hộp thư đến) */
    @Index
    @Column({ type: DataType.STRING(10), allowNull: false })
    decider: string;

    /** Tiêu đề tự sinh, dễ đọc */
    @Column({ type: DataType.STRING(500), allowNull: false })
    title: string;

    @Column({ type: DataType.TEXT, allowNull: false })
    reason: string;

    /** Loại đối tượng bị đề xuất: SESSION | MEMBER | RECAP | AWARD... và id của nó (liên kết về dữ liệu gốc) */
    @Column({ type: DataType.STRING(20), allowNull: true })
    targetType?: string;

    @Column({ type: DataType.STRING(24), allowNull: true })
    targetId?: string;

    /** Nội dung đề xuất theo từng loại (mã cặp mới, số điểm, kỳ, nguồn mentoring...) */
    @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {} })
    payload: Record<string, unknown>;

    @Index
    @Column({ type: DataType.STRING(24), allowNull: false })
    proposerUserId: string;

    @Column({ type: DataType.STRING(24), allowNull: true })
    proposerMemberId?: string;

    @Column({ type: DataType.STRING(255), allowNull: false })
    proposerName: string;

    /** Chức vụ khi gửi đề xuất, ví dụ "Trưởng ban MTE" */
    @Column({ type: DataType.STRING(100), allowNull: false })
    proposerRole: string;

    @Column({ type: DataType.STRING(24), allowNull: true })
    deciderUserId?: string;

    @Column({ type: DataType.STRING(255), allowNull: true })
    deciderName?: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    decisionNote?: string;

    @Column({ type: DataType.DATE, allowNull: true })
    decidedAt?: Date;

    /** Bản ghi sinh ra khi duyệt (ví dụ id dòng điều chỉnh điểm), để truy vết */
    @Column({ type: DataType.STRING(24), allowNull: true })
    resultRef?: string;
}
