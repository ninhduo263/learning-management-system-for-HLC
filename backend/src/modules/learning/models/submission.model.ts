import { StrObjectId } from "@common/constant";
import { NumberColumn } from "@common/decorator/sql-column.decorator";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";
import { SubmissionReviewStatus, SubmissionStatus } from "../common/constant";
import { Submission } from "../entities/submission.entity";

@Table({ tableName: Entity.SUBMISSION })
export class SubmissionModel extends Model implements Submission {
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    moduleId: string;

    @Column({ type: DataType.STRING(24), allowNull: true })
    assignmentId?: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    memberId: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    periodId: string;

    @Column({ type: DataType.STRING(20), allowNull: false })
    cycleKey: string;

    @Column({ type: DataType.STRING(24), allowNull: true })
    libraryItemId?: string;

    @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {} })
    data?: Record<string, unknown>;

    @Column({
        type: DataType.STRING,
        validate: { isIn: [Object.values(SubmissionStatus)] },
        allowNull: false,
        defaultValue: SubmissionStatus.SUBMITTED,
    })
    status?: SubmissionStatus;

    @Column({ type: DataType.DATE, allowNull: true })
    submittedAt?: Date;

    @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
    isLate?: boolean;

    @Column({
        type: DataType.STRING,
        validate: { isIn: [Object.values(SubmissionReviewStatus)] },
        allowNull: false,
        defaultValue: SubmissionReviewStatus.PENDING,
    })
    reviewStatus?: SubmissionReviewStatus;

    @Column({ type: DataType.STRING(24), allowNull: true })
    reviewerId?: string;

    @Column({ type: DataType.DATE, allowNull: true })
    reviewedAt?: Date;

    @Column({ type: DataType.TEXT, allowNull: true })
    feedback?: string;

    @NumberColumn({ type: DataType.DECIMAL(6, 2), allowNull: true })
    totalScore?: number;
}
