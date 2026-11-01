import { PartialType } from "@nestjs/swagger";
import { AllowanceSummary } from "../entities/allowance-summary.entity";

export class AllowanceSummaryConditionDto extends PartialType(
    AllowanceSummary,
) {}
