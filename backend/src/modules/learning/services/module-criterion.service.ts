import { BaseService } from "@config/service/base.service";
import { Entity } from "@module/repository";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { InjectTransaction } from "@module/repository/common/transaction";
import { Injectable } from "@nestjs/common";
import { ModuleCriterion } from "../entities/module-criterion.entity";
import { ModuleCriterionRepository } from "../repositories/module-criterion-repository.interface";

@Injectable()
export class ModuleCriterionService extends BaseService<
    ModuleCriterion,
    ModuleCriterionRepository
> {
    constructor(
        @InjectRepository(Entity.MODULE_CRITERION)
        private readonly moduleCriterionRepository: ModuleCriterionRepository,
        @InjectTransaction()
        private readonly moduleCriterionTransaction: BaseTransaction,
    ) {
        super(moduleCriterionRepository, {
            notFoundCode: "error-record-not-found",
            transaction: moduleCriterionTransaction,
        });
    }
}
