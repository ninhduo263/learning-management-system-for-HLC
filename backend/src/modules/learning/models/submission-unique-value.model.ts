import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";
import { SubmissionUniqueValue } from "../entities/submission-unique-value.entity";

@Table({ tableName: Entity.SUBMISSION_UNIQUE_VALUE })
export class SubmissionUniqueValueModel
    extends Model
    implements SubmissionUniqueValue
{
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    moduleId: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    fieldId: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    submissionId: string;

    @Column({ type: DataType.STRING(500), allowNull: false })
    normalizedValue: string;
}
