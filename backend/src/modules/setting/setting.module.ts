import { SqlTransaction } from "@module/repository/sequelize/sql.transaction";
import { SettingSqlRepository } from "@module/setting/repository/setting-sql.repository";
import { Entity } from "@module/repository";
import { RepositoryProvider } from "@module/repository/common/repository";
import { TransactionProvider } from "@module/repository/common/transaction";
import { Global, Module } from "@nestjs/common";
import { SettingImportService } from "./setting-import.service";
import { SettingController } from "./setting.controller";
import { SettingService } from "./setting.service";

@Global()
@Module({
    providers: [
        SettingService,
        SettingImportService,
        RepositoryProvider(Entity.SETTING, SettingSqlRepository),
        TransactionProvider(SqlTransaction),
    ],
    controllers: [SettingController],
    exports: [SettingService],
})
export class SettingModule {}
