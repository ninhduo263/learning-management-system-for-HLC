import { BaseService } from "@config/service/base.service";
import { Entity } from "@module/repository";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { InjectTransaction } from "@module/repository/common/transaction";
import { Injectable } from "@nestjs/common";
import { AllowanceSummary } from "../entities/allowance-summary.entity";
import { AllowanceSummaryRepository } from "../repositories/allowance-summary-repository.interface";

@Injectable()
export class AllowanceSummaryService extends BaseService<
    AllowanceSummary,
    AllowanceSummaryRepository
> {
    constructor(
        @InjectRepository(Entity.ALLOWANCE_SUMMARY)
        private readonly allowanceSummaryRepository: AllowanceSummaryRepository,
        @InjectTransaction()
        private readonly allowanceSummaryTransaction: BaseTransaction,
    ) {
        super(allowanceSummaryRepository, {
            notFoundCode: "error-record-not-found",
            transaction: allowanceSummaryTransaction,
        });
    }
}
