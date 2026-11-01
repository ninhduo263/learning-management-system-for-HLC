import { SqlTransaction } from "@module/repository/sequelize/sql.transaction";
import { UserSqlRepository } from "@module/user/repository/user-sql.repository";
import { Entity } from "@module/repository";
import { RepositoryProvider } from "@module/repository/common/repository";
import { TransactionProvider } from "@module/repository/common/transaction";
import { Module } from "@nestjs/common";
import { UserImportController } from "./controller/user-import.controller";
import { UserController } from "./controller/user.controller";
import { UserImportService } from "./service/user-import.service";
import { UserService } from "./service/user.service";

@Module({
    controllers: [UserController, UserImportController],
    providers: [
        UserService,
        UserImportService,
        RepositoryProvider(Entity.USER, UserSqlRepository),
        TransactionProvider(SqlTransaction),
    ],
    exports: [UserService],
})
export class UserModule {}
