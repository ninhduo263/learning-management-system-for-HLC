import { PartialType } from "@nestjs/swagger";
import { Position } from "../entities/position.entity";

export class PositionConditionDto extends PartialType(Position) {}
