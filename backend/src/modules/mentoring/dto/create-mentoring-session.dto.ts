import { OmitType } from "@nestjs/swagger";
import { MentoringSession } from "../entities/mentoring-session.entity";

export class CreateMentoringSessionDto extends OmitType(MentoringSession, [
    "_id",
]) {}
