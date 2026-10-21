import { BaseRepository } from "@module/repository/common/base-repository.interface";
import { FundContribution } from "../entities/fund-contribution.entity";

export interface FundContributionRepository
    extends BaseRepository<FundContribution> {}
