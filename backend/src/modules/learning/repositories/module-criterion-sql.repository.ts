import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { ModuleCriterion } from "../entities/module-criterion.entity";
import { ModuleCriterionModel } from "../models/module-criterion.model";
import { ModuleCriterionRepository } from "./module-criterion-repository.interface";

export class ModuleCriterionSqlRepository
    extends SqlRepository<ModuleCriterion>
    implements ModuleCriterionRepository
{
    constructor(
        @InjectModel(ModuleCriterionModel)
        private readonly moduleCriterionModel: typeof ModuleCriterionModel,
    ) {
        super(moduleCriterionModel);
    }
}
