import { DefaultModules, DefaultProviders } from "@config/module/config";
import { AuditLogModule } from "@module/audit-log/audit-log.module";
import { IncrementModule } from "@module/increment/increment.module";
import { RedisModule } from "@module/redis/redis.module";
import { SsoModule } from "@module/sso/sso.module";
import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AuthModule } from "./modules/auth/auth.module";
import { CommonProviderModule } from "./modules/common-provider/common-provider.module";
import { DataPartitionModule } from "./modules/data-partition/data-partition.module";
import { DataProcessModule } from "./modules/data-process/data-process.module";
import { EventAccountModule } from "./modules/event-account/event-account.module";
import { FileModule } from "./modules/file/file.module";
import { ImportSessionModule } from "./modules/import-session/import-session.module";
import { NotificationModule } from "./modules/notification/notification.module";
import { OneSignalModule } from "./modules/one-signal/one-signal.module";
import { QuyTacMaModule } from "./modules/quy-tac-ma/quy-tac-ma.module";
import { SettingModule } from "./modules/setting/setting.module";
import { TopicModule } from "./modules/topic/topic.module";
import { UserModule } from "./modules/user/user.module";
import { EventModule } from "./modules/event/event.module";
import { EventLogModule } from "./modules/event-log/event-log.module";
import { WebSocketModule } from "./modules/websocket/websocket.module";

@Module({
    imports: [
        ...DefaultModules,
        AuthModule,
        UserModule,
        EventAccountModule,
        OneSignalModule,
        NotificationModule,
        TopicModule,
        FileModule,
        SettingModule,
        RedisModule,
        SsoModule,
        IncrementModule,
        ImportSessionModule,
        QuyTacMaModule,
        AuditLogModule,
        DataProcessModule,
        DataPartitionModule,
        CommonProviderModule,
        EventModule,
        EventLogModule,
        WebSocketModule,
    ],
    providers: [...DefaultProviders],
    controllers: [AppController],
})
export class AppModule {}
