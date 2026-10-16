import { Entity } from "@module/repository";
import { RepositoryProvider } from "@module/repository/common/repository";
import { TransactionProvider } from "@module/repository/common/transaction";
import { MongoTransaction } from "@module/repository/mongo/mongo.transaction";
import { Module } from "@nestjs/common";
import { UserImportController } from "./controller/user-import.controller";
import { UserController } from "./controller/user.controller";
import { UserMongoRepository } from "./repository/user-mongo.repository";
import { UserImportService } from "./service/user-import.service";
import { UserService } from "./service/user.service";

@Module({
    controllers: [UserController, UserImportController],
    providers: [
        UserService,
        UserImportService,
        RepositoryProvider(Entity.USER, UserMongoRepository),
        TransactionProvider(MongoTransaction),
    ],
    exports: [UserService],
})
export class UserModule {}
