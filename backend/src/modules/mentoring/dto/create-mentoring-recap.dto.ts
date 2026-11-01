import { OmitType } from "@nestjs/swagger";
import { MentoringRecap } from "../entities/mentoring-recap.entity";

export class CreateMentoringRecapDto extends OmitType(MentoringRecap, [
    "_id",
]) {}
