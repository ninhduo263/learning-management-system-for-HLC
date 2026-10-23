import { NumberColumn } from "@common/decorator/sql-column.decorator";
import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";
import { MentoringRole, RecapReviewStatus } from "../common/constant";
import { MentoringRecap } from "../entities/mentoring-recap.entity";

@Table({ tableName: Entity.MENTORING_RECAP })
export class MentoringRecapModel extends Model implements MentoringRecap {
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    sessionId: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    memberId: string;

    @Column({
        type: DataType.STRING,
        validate: { isIn: [Object.values(MentoringRole)] },
        allowNull: false,
    })
    role: MentoringRole;

    @Column({ type: DataType.TEXT, allowNull: false })
    content: string;

    @Column({ type: DataType.DATE, allowNull: false })
    firstSubmittedAt: Date;

    @Column({ type: DataType.DATE, allowNull: false })
    lastSubmittedAt: Date;

    @Column({ type: DataType.BOOLEAN, allowNull: false })
    isLate: boolean;

    @Column({
        type: DataType.STRING,
        validate: { isIn: [Object.values(RecapReviewStatus)] },
        allowNull: false,
        defaultValue: RecapReviewStatus.PENDING,
    })
    reviewStatus?: RecapReviewStatus;

    @Column({ type: DataType.STRING(24), allowNull: true })
    reviewedBy?: string;

    @Column({ type: DataType.DATE, allowNull: true })
    reviewedAt?: Date;

    @Column({ type: DataType.TEXT, allowNull: true })
    reviewNote?: string;

    /** Điểm chất lượng recap (thang 100), Leader nhóm / admin chấm theo tiêu chí module RECAP */
    @NumberColumn({ type: DataType.DECIMAL(5, 2), allowNull: true })
    score?: number;

    /** [{ criterionId, name, maxScore, score }] */
    @Column({ type: DataType.JSONB, allowNull: true })
    scoreDetails?: Record<string, unknown>[];

    @Column({ type: DataType.TEXT, allowNull: true })
    scoreFeedback?: string;

    @Column({ type: DataType.STRING(24), allowNull: true })
    scoredBy?: string;

    @Column({ type: DataType.DATE, allowNull: true })
    scoredAt?: Date;

    /** Nhập hộ: tài khoản admin nhập, thời điểm, lý do (null = thành viên tự nộp) */
    @Column({ type: DataType.STRING(24), allowNull: true })
    proxyBy?: string;

    @Column({ type: DataType.DATE, allowNull: true })
    proxyAt?: Date;

    @Column({ type: DataType.TEXT, allowNull: true })
    proxyReason?: string;

    /** Lô nhập dữ liệu quý cũ */
    @Column({ type: DataType.STRING(24), allowNull: true })
    importBatchId?: string;
}
