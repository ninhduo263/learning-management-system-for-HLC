import { OmitType } from "@nestjs/swagger";
import { MentoringQuarter } from "../entities/mentoring-quarter.entity";

export class CreateMentoringQuarterDto extends OmitType(MentoringQuarter, [
    "_id",
]) {}
