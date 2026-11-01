import { PartialType } from "@nestjs/swagger";
import { MentoringScheduleLog } from "../entities/mentoring-schedule-log.entity";

export class MentoringScheduleLogConditionDto extends PartialType(
    MentoringScheduleLog,
) {}
