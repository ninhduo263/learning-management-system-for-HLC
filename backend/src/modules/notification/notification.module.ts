import { NotificationSqlRepository } from "@module/notification/repository/notification-sql.repository";
import { OneSignalModule } from "@module/one-signal/one-signal.module";
import { Entity } from "@module/repository";
import { RepositoryProvider } from "@module/repository/common/repository";
import { Module } from "@nestjs/common";
import { NotificationController } from "./notification.controller";
import { NotificationService } from "./notification.service";

@Module({
    imports: [OneSignalModule],
    providers: [
        NotificationService,
        RepositoryProvider(Entity.NOTIFICATION, NotificationSqlRepository),
    ],
    controllers: [NotificationController],
})
export class NotificationModule {}
