import { Entity } from "@module/repository";
import { RepositoryProvider } from "@module/repository/common/repository";
import { TransactionProvider } from "@module/repository/common/transaction";
import { MongoTransaction } from "@module/repository/mongo/mongo.transaction";
import { Global, Module } from "@nestjs/common";
import { SettingMongoRepository } from "./repository/setting-mongo.repository";
import { SettingImportService } from "./setting-import.service";
import { SettingController } from "./setting.controller";
import { SettingService } from "./setting.service";

@Global()
@Module({
    providers: [
        SettingService,
        SettingImportService,
        RepositoryProvider(Entity.SETTING, SettingMongoRepository),
        TransactionProvider(MongoTransaction),
    ],
    controllers: [SettingController],
    exports: [SettingService],
})
export class SettingModule {}
