import { BaseService } from "@config/service/base.service";
import { Entity } from "@module/repository";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { InjectTransaction } from "@module/repository/common/transaction";
import { Injectable } from "@nestjs/common";
import { MentoringScheduleLog } from "../entities/mentoring-schedule-log.entity";
import { MentoringScheduleLogRepository } from "../repositories/mentoring-schedule-log-repository.interface";

@Injectable()
export class MentoringScheduleLogService extends BaseService<
    MentoringScheduleLog,
    MentoringScheduleLogRepository
> {
    constructor(
        @InjectRepository(Entity.MENTORING_SCHEDULE_LOG)
        private readonly mentoringScheduleLogRepository: MentoringScheduleLogRepository,
        @InjectTransaction()
        private readonly mentoringScheduleLogTransaction: BaseTransaction,
    ) {
        super(mentoringScheduleLogRepository, {
            notFoundCode: "error-record-not-found",
            transaction: mentoringScheduleLogTransaction,
        });
    }
}
