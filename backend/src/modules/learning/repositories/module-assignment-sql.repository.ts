import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { ModuleAssignment } from "../entities/module-assignment.entity";
import { ModuleAssignmentModel } from "../models/module-assignment.model";
import { ModuleAssignmentRepository } from "./module-assignment-repository.interface";

export class ModuleAssignmentSqlRepository
    extends SqlRepository<ModuleAssignment>
    implements ModuleAssignmentRepository
{
    constructor(
        @InjectModel(ModuleAssignmentModel)
        private readonly moduleAssignmentModel: typeof ModuleAssignmentModel,
    ) {
        super(moduleAssignmentModel);
    }
}
