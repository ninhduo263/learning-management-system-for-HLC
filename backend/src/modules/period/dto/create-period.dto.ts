import { OmitType } from "@nestjs/swagger";
import { Period } from "../entities/period.entity";

export class CreatePeriodDto extends OmitType(Period, ["_id"]) {}
