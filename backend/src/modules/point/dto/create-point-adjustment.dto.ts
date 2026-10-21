import { OmitType } from "@nestjs/swagger";
import { PointAdjustment } from "../entities/point-adjustment.entity";

export class CreatePointAdjustmentDto extends OmitType(PointAdjustment, [
    "_id",
]) {}
