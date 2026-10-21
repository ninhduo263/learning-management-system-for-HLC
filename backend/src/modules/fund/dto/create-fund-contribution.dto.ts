import { OmitType } from "@nestjs/swagger";
import { FundContribution } from "../entities/fund-contribution.entity";

export class CreateFundContributionDto extends OmitType(FundContribution, [
    "_id",
]) {}
