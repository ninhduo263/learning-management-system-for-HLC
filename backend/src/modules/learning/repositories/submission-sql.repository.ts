import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { Submission } from "../entities/submission.entity";
import { SubmissionModel } from "../models/submission.model";
import { SubmissionRepository } from "./submission-repository.interface";

export class SubmissionSqlRepository
    extends SqlRepository<Submission>
    implements SubmissionRepository
{
    constructor(
        @InjectModel(SubmissionModel)
        private readonly submissionModel: typeof SubmissionModel,
    ) {
        super(submissionModel);
    }
}
