import { PartialType } from "@nestjs/swagger";
import { CreateFundContributionDto } from "./create-fund-contribution.dto";

export class UpdateFundContributionDto extends PartialType(
    CreateFundContributionDto,
) {}
