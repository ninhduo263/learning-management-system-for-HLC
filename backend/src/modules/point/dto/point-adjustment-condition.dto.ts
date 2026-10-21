import { PartialType } from "@nestjs/swagger";
import { PointAdjustment } from "../entities/point-adjustment.entity";

export class PointAdjustmentConditionDto extends PartialType(PointAdjustment) {}
