import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { AdminPermission } from "../entities/admin-permission.entity";
import { AdminPermissionModel } from "../models/admin-permission.model";
import { AdminPermissionRepository } from "./admin-permission-repository.interface";

export class AdminPermissionSqlRepository
    extends SqlRepository<AdminPermission>
    implements AdminPermissionRepository
{
    constructor(
        @InjectModel(AdminPermissionModel)
        private readonly adminPermissionModel: typeof AdminPermissionModel,
    ) {
        super(adminPermissionModel);
    }
}
