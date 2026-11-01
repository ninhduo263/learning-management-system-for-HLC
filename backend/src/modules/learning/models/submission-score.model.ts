import { StrObjectId } from "@common/constant";
import { NumberColumn } from "@common/decorator/sql-column.decorator";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";
import { SubmissionScore } from "../entities/submission-score.entity";

@Table({ tableName: Entity.SUBMISSION_SCORE })
export class SubmissionScoreModel extends Model implements SubmissionScore {
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    submissionId: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    criterionId: string;

    @NumberColumn({ type: DataType.DECIMAL(6, 2), allowNull: false })
    score: number;

    @Column({ type: DataType.TEXT, allowNull: true })
    comment?: string;

    @Column({ type: DataType.STRING(24), allowNull: true })
    scoredBy?: string;
}
