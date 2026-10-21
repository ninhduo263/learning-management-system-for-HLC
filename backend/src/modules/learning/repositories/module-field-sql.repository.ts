import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { ModuleField } from "../entities/module-field.entity";
import { ModuleFieldModel } from "../models/module-field.model";
import { ModuleFieldRepository } from "./module-field-repository.interface";

export class ModuleFieldSqlRepository
    extends SqlRepository<ModuleField>
    implements ModuleFieldRepository
{
    constructor(
        @InjectModel(ModuleFieldModel)
        private readonly moduleFieldModel: typeof ModuleFieldModel,
    ) {
        super(moduleFieldModel);
    }
}
