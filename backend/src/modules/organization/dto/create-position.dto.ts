import { OmitType } from "@nestjs/swagger";
import { Position } from "../entities/position.entity";

export class CreatePositionDto extends OmitType(Position, ["_id"]) {}
