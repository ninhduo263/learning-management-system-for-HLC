import { PartialType } from "@nestjs/swagger";
import { MentoringSession } from "../entities/mentoring-session.entity";

export class MentoringSessionConditionDto extends PartialType(
    MentoringSession,
) {}
