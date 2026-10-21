import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { Department } from "../entities/department.entity";
import { DepartmentModel } from "../models/department.model";
import { DepartmentRepository } from "./department-repository.interface";

export class DepartmentSqlRepository
    extends SqlRepository<Department>
    implements DepartmentRepository
{
    constructor(
        @InjectModel(DepartmentModel)
        private readonly departmentModel: typeof DepartmentModel,
    ) {
        super(departmentModel);
    }
}
