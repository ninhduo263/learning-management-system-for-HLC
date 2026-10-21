import { PartialType } from "@nestjs/swagger";
import { CreatePointAdjustmentDto } from "./create-point-adjustment.dto";

export class UpdatePointAdjustmentDto extends PartialType(
    CreatePointAdjustmentDto,
) {}
