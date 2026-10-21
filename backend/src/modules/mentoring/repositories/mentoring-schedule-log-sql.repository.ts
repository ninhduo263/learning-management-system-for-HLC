import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { MentoringScheduleLog } from "../entities/mentoring-schedule-log.entity";
import { MentoringScheduleLogModel } from "../models/mentoring-schedule-log.model";
import { MentoringScheduleLogRepository } from "./mentoring-schedule-log-repository.interface";

export class MentoringScheduleLogSqlRepository
    extends SqlRepository<MentoringScheduleLog>
    implements MentoringScheduleLogRepository
{
    constructor(
        @InjectModel(MentoringScheduleLogModel)
        private readonly mentoringScheduleLogModel: typeof MentoringScheduleLogModel,
    ) {
        super(mentoringScheduleLogModel);
    }
}
