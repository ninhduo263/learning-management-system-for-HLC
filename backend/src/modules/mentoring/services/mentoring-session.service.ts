import { BaseService } from "@config/service/base.service";
import { Entity } from "@module/repository";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { InjectTransaction } from "@module/repository/common/transaction";
import { Injectable } from "@nestjs/common";
import { MentoringSession } from "../entities/mentoring-session.entity";
import { MentoringSessionRepository } from "../repositories/mentoring-session-repository.interface";

@Injectable()
export class MentoringSessionService extends BaseService<
    MentoringSession,
    MentoringSessionRepository
> {
    constructor(
        @InjectRepository(Entity.MENTORING_SESSION)
        private readonly mentoringSessionRepository: MentoringSessionRepository,
        @InjectTransaction()
        private readonly mentoringSessionTransaction: BaseTransaction,
    ) {
        super(mentoringSessionRepository, {
            notFoundCode: "error-record-not-found",
            transaction: mentoringSessionTransaction,
        });
    }
}
