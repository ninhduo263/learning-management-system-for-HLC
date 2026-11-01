import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { PointRule } from "../entities/point-rule.entity";
import { PointRuleModel } from "../models/point-rule.model";
import { PointRuleRepository } from "./point-rule-repository.interface";

export class PointRuleSqlRepository
    extends SqlRepository<PointRule>
    implements PointRuleRepository
{
    constructor(
        @InjectModel(PointRuleModel)
        private readonly pointRuleModel: typeof PointRuleModel,
    ) {
        super(pointRuleModel);
    }
}
