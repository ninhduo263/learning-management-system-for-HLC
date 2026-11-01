import { BaseService } from "@config/service/base.service";
import { Entity } from "@module/repository";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { InjectTransaction } from "@module/repository/common/transaction";
import { Injectable } from "@nestjs/common";
import { Period } from "../entities/period.entity";
import { PeriodRepository } from "../repositories/period-repository.interface";

@Injectable()
export class PeriodService extends BaseService<Period, PeriodRepository> {
    constructor(
        @InjectRepository(Entity.PERIOD)
        private readonly periodRepository: PeriodRepository,
        @InjectTransaction()
        private readonly periodTransaction: BaseTransaction,
    ) {
        super(periodRepository, {
            notFoundCode: "error-record-not-found",
            transaction: periodTransaction,
        });
    }
}
