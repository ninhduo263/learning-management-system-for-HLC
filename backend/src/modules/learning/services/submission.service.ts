import { BaseService } from "@config/service/base.service";
import { Entity } from "@module/repository";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { InjectTransaction } from "@module/repository/common/transaction";
import { Injectable } from "@nestjs/common";
import { Submission } from "../entities/submission.entity";
import { SubmissionRepository } from "../repositories/submission-repository.interface";

@Injectable()
export class SubmissionService extends BaseService<
    Submission,
    SubmissionRepository
> {
    constructor(
        @InjectRepository(Entity.SUBMISSION)
        private readonly submissionRepository: SubmissionRepository,
        @InjectTransaction()
        private readonly submissionTransaction: BaseTransaction,
    ) {
        super(submissionRepository, {
            notFoundCode: "error-record-not-found",
            transaction: submissionTransaction,
        });
    }
}
