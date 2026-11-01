import { OmitType } from "@nestjs/swagger";
import { MentoringPair } from "../entities/mentoring-pair.entity";

export class CreateMentoringPairDto extends OmitType(MentoringPair, ["_id"]) {}
