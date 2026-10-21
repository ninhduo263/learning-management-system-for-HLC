import { OmitType } from "@nestjs/swagger";
import { MentoringAward } from "../entities/mentoring-award.entity";

export class CreateMentoringAwardDto extends OmitType(MentoringAward, [
    "_id",
]) {}
