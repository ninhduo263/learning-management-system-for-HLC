import { PartialType } from "@nestjs/swagger";
import { Period } from "../entities/period.entity";

export class PeriodConditionDto extends PartialType(Period) {}
