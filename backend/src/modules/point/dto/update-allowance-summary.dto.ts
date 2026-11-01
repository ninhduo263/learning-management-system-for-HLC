import { PartialType } from "@nestjs/swagger";
import { CreateAllowanceSummaryDto } from "./create-allowance-summary.dto";

export class UpdateAllowanceSummaryDto extends PartialType(
    CreateAllowanceSummaryDto,
) {}
