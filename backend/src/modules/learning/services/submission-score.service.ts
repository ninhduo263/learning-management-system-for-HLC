import { BaseService } from "@config/service/base.service";
import { Entity } from "@module/repository";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { InjectTransaction } from "@module/repository/common/transaction";
import { Injectable } from "@nestjs/common";
import { SubmissionScore } from "../entities/submission-score.entity";
import { SubmissionScoreRepository } from "../repositories/submission-score-repository.interface";

@Injectable()
export class SubmissionScoreService extends BaseService<
    SubmissionScore,
    SubmissionScoreRepository
> {
    constructor(
        @InjectRepository(Entity.SUBMISSION_SCORE)
        private readonly submissionScoreRepository: SubmissionScoreRepository,
        @InjectTransaction()
        private readonly submissionScoreTransaction: BaseTransaction,
    ) {
        super(submissionScoreRepository, {
            notFoundCode: "error-record-not-found",
            transaction: submissionScoreTransaction,
        });
    }
}
