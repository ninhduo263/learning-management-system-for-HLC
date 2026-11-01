import { OmitType } from "@nestjs/swagger";
import { MentoringScheduleLog } from "../entities/mentoring-schedule-log.entity";

export class CreateMentoringScheduleLogDto extends OmitType(
    MentoringScheduleLog,
    ["_id"],
) {}
