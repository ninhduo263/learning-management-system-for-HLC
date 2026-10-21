import { BaseService } from "@config/service/base.service";
import { Entity } from "@module/repository";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { InjectTransaction } from "@module/repository/common/transaction";
import { Injectable } from "@nestjs/common";
import { MentoringRecap } from "../entities/mentoring-recap.entity";
import { MentoringRecapRepository } from "../repositories/mentoring-recap-repository.interface";

@Injectable()
export class MentoringRecapService extends BaseService<
    MentoringRecap,
    MentoringRecapRepository
> {
    constructor(
        @InjectRepository(Entity.MENTORING_RECAP)
        private readonly mentoringRecapRepository: MentoringRecapRepository,
        @InjectTransaction()
        private readonly mentoringRecapTransaction: BaseTransaction,
    ) {
        super(mentoringRecapRepository, {
            notFoundCode: "error-record-not-found",
            transaction: mentoringRecapTransaction,
        });
    }
}
