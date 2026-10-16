import { OneSignalModule } from "@module/one-signal/one-signal.module";
import { Entity } from "@module/repository";
import { RepositoryProvider } from "@module/repository/common/repository";
import { Module } from "@nestjs/common";
import { NotificationController } from "./notification.controller";
import { NotificationService } from "./notification.service";
import { NotificationMongoRepository } from "./repository/notification-mongo.repository";

@Module({
    imports: [OneSignalModule],
    providers: [
        NotificationService,
        RepositoryProvider(Entity.NOTIFICATION, NotificationMongoRepository),
    ],
    controllers: [NotificationController],
})
export class NotificationModule {}
