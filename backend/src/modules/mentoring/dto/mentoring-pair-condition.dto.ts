import { PartialType } from "@nestjs/swagger";
import { MentoringPair } from "../entities/mentoring-pair.entity";

export class MentoringPairConditionDto extends PartialType(MentoringPair) {}
