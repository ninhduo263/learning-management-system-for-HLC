import { OmitType } from "@nestjs/swagger";
import { PointType } from "../entities/point-type.entity";

export class CreatePointTypeDto extends OmitType(PointType, ["_id"]) {}
