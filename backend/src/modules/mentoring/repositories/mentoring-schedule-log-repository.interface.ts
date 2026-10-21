import { BaseRepository } from "@module/repository/common/base-repository.interface";
import { MentoringScheduleLog } from "../entities/mentoring-schedule-log.entity";

export interface MentoringScheduleLogRepository
    extends BaseRepository<MentoringScheduleLog> {}
