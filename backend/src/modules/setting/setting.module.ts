import { SqlTransaction } from "@module/repository/sequelize/sql.transaction";
import { SettingSqlRepository } from "@module/setting/repository/setting-sql.repository";
import { Entity } from "@module/repository";
import { RepositoryProvider } from "@module/repository/common/repository";
import { TransactionProvider } from "@module/repository/common/transaction";
import { Global, Module } from "@nestjs/common";
import { SettingImportService } from "./setting-import.service";
import { SettingController } from "./setting.controller";
import { SettingService } from "./setting.service";
import { SecurityConfigController } from "./security-config.controller";
import { SecurityConfigService } from "./security-config.service";

@Global()
@Module({
    providers: [
        SettingService,
        SettingImportService,
        SecurityConfigService,
        RepositoryProvider(Entity.SETTING, SettingSqlRepository),
        TransactionProvider(SqlTransaction),
    ],
    controllers: [SettingController, SecurityConfigController],
    exports: [SettingService, SecurityConfigService],
})
export class SettingModule {}
