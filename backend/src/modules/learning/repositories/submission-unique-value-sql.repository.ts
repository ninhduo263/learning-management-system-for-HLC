import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { SubmissionUniqueValue } from "../entities/submission-unique-value.entity";
import { SubmissionUniqueValueModel } from "../models/submission-unique-value.model";
import { SubmissionUniqueValueRepository } from "./submission-unique-value-repository.interface";

export class SubmissionUniqueValueSqlRepository
    extends SqlRepository<SubmissionUniqueValue>
    implements SubmissionUniqueValueRepository
{
    constructor(
        @InjectModel(SubmissionUniqueValueModel)
        private readonly submissionUniqueValueModel: typeof SubmissionUniqueValueModel,
    ) {
        super(submissionUniqueValueModel);
    }
}
