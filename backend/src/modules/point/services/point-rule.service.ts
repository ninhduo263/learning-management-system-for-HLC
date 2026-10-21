import { BaseService } from "@config/service/base.service";
import { Entity } from "@module/repository";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { InjectTransaction } from "@module/repository/common/transaction";
import { Injectable } from "@nestjs/common";
import { PointRule } from "../entities/point-rule.entity";
import { PointRuleRepository } from "../repositories/point-rule-repository.interface";

@Injectable()
export class PointRuleService extends BaseService<
    PointRule,
    PointRuleRepository
> {
    constructor(
        @InjectRepository(Entity.POINT_RULE)
        private readonly pointRuleRepository: PointRuleRepository,
        @InjectTransaction()
        private readonly pointRuleTransaction: BaseTransaction,
    ) {
        super(pointRuleRepository, {
            notFoundCode: "error-record-not-found",
            transaction: pointRuleTransaction,
        });
    }
}
