import { PartialType } from "@nestjs/swagger";
import { PointType } from "../entities/point-type.entity";

export class PointTypeConditionDto extends PartialType(PointType) {}
