import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { FundContribution } from "../entities/fund-contribution.entity";
import { FundContributionModel } from "../models/fund-contribution.model";
import { FundContributionRepository } from "./fund-contribution-repository.interface";

export class FundContributionSqlRepository
    extends SqlRepository<FundContribution>
    implements FundContributionRepository
{
    constructor(
        @InjectModel(FundContributionModel)
        private readonly fundContributionModel: typeof FundContributionModel,
    ) {
        super(fundContributionModel);
    }
}
