import { PartialType } from "@nestjs/swagger";
import { MentoringRecap } from "../entities/mentoring-recap.entity";

export class MentoringRecapConditionDto extends PartialType(MentoringRecap) {}
