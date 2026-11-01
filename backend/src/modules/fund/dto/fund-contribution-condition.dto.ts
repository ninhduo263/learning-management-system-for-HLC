import { PartialType } from "@nestjs/swagger";
import { FundContribution } from "../entities/fund-contribution.entity";

export class FundContributionConditionDto extends PartialType(
    FundContribution,
) {}
