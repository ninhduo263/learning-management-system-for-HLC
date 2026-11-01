import { BaseService } from "@config/service/base.service";
import { Entity } from "@module/repository";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { InjectTransaction } from "@module/repository/common/transaction";
import { Injectable } from "@nestjs/common";
import { SubmissionUniqueValue } from "../entities/submission-unique-value.entity";
import { SubmissionUniqueValueRepository } from "../repositories/submission-unique-value-repository.interface";

@Injectable()
export class SubmissionUniqueValueService extends BaseService<
    SubmissionUniqueValue,
    SubmissionUniqueValueRepository
> {
    constructor(
        @InjectRepository(Entity.SUBMISSION_UNIQUE_VALUE)
        private readonly submissionUniqueValueRepository: SubmissionUniqueValueRepository,
        @InjectTransaction()
        private readonly submissionUniqueValueTransaction: BaseTransaction,
    ) {
        super(submissionUniqueValueRepository, {
            notFoundCode: "error-record-not-found",
            transaction: submissionUniqueValueTransaction,
        });
    }
}
