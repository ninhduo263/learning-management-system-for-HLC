import { PartialType } from "@nestjs/swagger";
import { CreateMentoringScheduleLogDto } from "./create-mentoring-schedule-log.dto";

export class UpdateMentoringScheduleLogDto extends PartialType(
    CreateMentoringScheduleLogDto,
) {}
