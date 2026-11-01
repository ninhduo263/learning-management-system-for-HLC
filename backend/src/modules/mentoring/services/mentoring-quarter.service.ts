import { BaseService } from "@config/service/base.service";
import { Entity } from "@module/repository";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { InjectTransaction } from "@module/repository/common/transaction";
import { Injectable } from "@nestjs/common";
import { MentoringQuarter } from "../entities/mentoring-quarter.entity";
import { MentoringQuarterRepository } from "../repositories/mentoring-quarter-repository.interface";

@Injectable()
export class MentoringQuarterService extends BaseService<
    MentoringQuarter,
    MentoringQuarterRepository
> {
    constructor(
        @InjectRepository(Entity.MENTORING_QUARTER)
        private readonly mentoringQuarterRepository: MentoringQuarterRepository,
        @InjectTransaction()
        private readonly mentoringQuarterTransaction: BaseTransaction,
    ) {
        super(mentoringQuarterRepository, {
            notFoundCode: "error-record-not-found",
            transaction: mentoringQuarterTransaction,
        });
    }
}
