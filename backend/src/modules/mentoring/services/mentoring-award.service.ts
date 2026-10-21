import { BaseService } from "@config/service/base.service";
import { Entity } from "@module/repository";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { InjectTransaction } from "@module/repository/common/transaction";
import { Injectable } from "@nestjs/common";
import { MentoringAward } from "../entities/mentoring-award.entity";
import { MentoringAwardRepository } from "../repositories/mentoring-award-repository.interface";

@Injectable()
export class MentoringAwardService extends BaseService<
    MentoringAward,
    MentoringAwardRepository
> {
    constructor(
        @InjectRepository(Entity.MENTORING_AWARD)
        private readonly mentoringAwardRepository: MentoringAwardRepository,
        @InjectTransaction()
        private readonly mentoringAwardTransaction: BaseTransaction,
    ) {
        super(mentoringAwardRepository, {
            notFoundCode: "error-record-not-found",
            transaction: mentoringAwardTransaction,
        });
    }
}
