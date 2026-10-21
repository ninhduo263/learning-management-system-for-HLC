import { BaseService } from "@config/service/base.service";
import { Entity } from "@module/repository";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { InjectTransaction } from "@module/repository/common/transaction";
import { Injectable } from "@nestjs/common";
import { FundContribution } from "../entities/fund-contribution.entity";
import { FundContributionRepository } from "../repositories/fund-contribution-repository.interface";

@Injectable()
export class FundContributionService extends BaseService<
    FundContribution,
    FundContributionRepository
> {
    constructor(
        @InjectRepository(Entity.FUND_CONTRIBUTION)
        private readonly fundContributionRepository: FundContributionRepository,
        @InjectTransaction()
        private readonly fundContributionTransaction: BaseTransaction,
    ) {
        super(fundContributionRepository, {
            notFoundCode: "error-record-not-found",
            transaction: fundContributionTransaction,
        });
    }
}
