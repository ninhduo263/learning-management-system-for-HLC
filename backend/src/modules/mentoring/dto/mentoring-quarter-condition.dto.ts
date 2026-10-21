import { PartialType } from "@nestjs/swagger";
import { MentoringQuarter } from "../entities/mentoring-quarter.entity";

export class MentoringQuarterConditionDto extends PartialType(
    MentoringQuarter,
) {}
