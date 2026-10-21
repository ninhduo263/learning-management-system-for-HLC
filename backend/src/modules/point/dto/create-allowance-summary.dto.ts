import { OmitType } from "@nestjs/swagger";
import { AllowanceSummary } from "../entities/allowance-summary.entity";

export class CreateAllowanceSummaryDto extends OmitType(AllowanceSummary, [
    "_id",
]) {}
