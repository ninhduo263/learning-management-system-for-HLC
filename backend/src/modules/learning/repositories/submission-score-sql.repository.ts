import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { SubmissionScore } from "../entities/submission-score.entity";
import { SubmissionScoreModel } from "../models/submission-score.model";
import { SubmissionScoreRepository } from "./submission-score-repository.interface";

export class SubmissionScoreSqlRepository
    extends SqlRepository<SubmissionScore>
    implements SubmissionScoreRepository
{
    constructor(
        @InjectModel(SubmissionScoreModel)
        private readonly submissionScoreModel: typeof SubmissionScoreModel,
    ) {
        super(submissionScoreModel);
    }
}
