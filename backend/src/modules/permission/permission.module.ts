import { Entity } from "@module/repository";
import { RepositoryProvider } from "@module/repository/common/repository";
import { TransactionProvider } from "@module/repository/common/transaction";
import { SqlTransaction } from "@module/repository/sequelize/sql.transaction";
import { ADMIN_SCOPE_CHECKER } from "@common/interface/admin-scope-checker.interface";
import { Global, Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { AccessController } from "./flow/access.controller";
import { AdminPermissionController } from "./controllers/admin-permission.controller";
import { AdminPermissionModel } from "./models/admin-permission.model";
import { AdminPermissionSqlRepository } from "./repositories/admin-permission-sql.repository";
import { AdminPermissionService } from "./services/admin-permission.service";

@Global()
@Module({
    imports: [SequelizeModule.forFeature([AdminPermissionModel])],
    controllers: [AccessController, AdminPermissionController],
    providers: [
        AdminPermissionService,
        RepositoryProvider(
            Entity.ADMIN_PERMISSION,
            AdminPermissionSqlRepository,
        ),
        SqlTransaction,
        TransactionProvider(SqlTransaction),
        { provide: ADMIN_SCOPE_CHECKER, useExisting: AdminPermissionService },
    ],
    exports: [AdminPermissionService, ADMIN_SCOPE_CHECKER],
})
export class PermissionModule {}
