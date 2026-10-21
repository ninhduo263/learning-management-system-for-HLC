import { PartialType } from "@nestjs/swagger";
import { MentoringAward } from "../entities/mentoring-award.entity";

export class MentoringAwardConditionDto extends PartialType(MentoringAward) {}
