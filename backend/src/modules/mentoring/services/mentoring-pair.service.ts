import { BaseService } from "@config/service/base.service";
import { Entity } from "@module/repository";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { InjectTransaction } from "@module/repository/common/transaction";
import { Injectable } from "@nestjs/common";
import { MentoringPair } from "../entities/mentoring-pair.entity";
import { MentoringPairRepository } from "../repositories/mentoring-pair-repository.interface";

@Injectable()
export class MentoringPairService extends BaseService<
    MentoringPair,
    MentoringPairRepository
> {
    constructor(
        @InjectRepository(Entity.MENTORING_PAIR)
        private readonly mentoringPairRepository: MentoringPairRepository,
        @InjectTransaction()
        private readonly mentoringPairTransaction: BaseTransaction,
    ) {
        super(mentoringPairRepository, {
            notFoundCode: "error-record-not-found",
            transaction: mentoringPairTransaction,
        });
    }
}
