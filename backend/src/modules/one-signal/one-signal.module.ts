import { QueueName } from "@common/constant";
import { AuthMongoRepository } from "@module/auth/repository/auth-mongo.repository";
import { OneSignalProcessor } from "@module/one-signal/provider/one-signal.process";
import { Entity } from "@module/repository";
import { RepositoryProvider } from "@module/repository/common/repository";
import { UserTopicMongoRepository } from "@module/topic/repository/user-topic-mongo.repository";
import { HttpModule } from "@nestjs/axios";
import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { OneSignalApiService } from "./one-signal-api.service";
import { OneSignalController } from "./one-signal.controller";
import { OneSignalService } from "./one-signal.service";
import { OneSignalUserMongoRepository } from "./repository/one-signal-user-mongo.repository";

@Module({
    imports: [
        BullModule.registerQueue({
            name: QueueName.ONE_SIGNAL,
            defaultJobOptions: {
                attempts: 3,
                removeOnComplete: true,
                removeOnFail: true,
                timeout: 60000,
            },
        }),
        HttpModule.register({
            timeout: 5000,
            maxRedirects: 5,
        }),
    ],
    providers: [
        OneSignalService,
        OneSignalApiService,
        OneSignalProcessor,
        RepositoryProvider(
            Entity.ONE_SIGNAL_USER,
            OneSignalUserMongoRepository,
        ),
        RepositoryProvider(Entity.USER_TOPIC, UserTopicMongoRepository),
        RepositoryProvider(Entity.AUTH, AuthMongoRepository),
    ],
    controllers: [OneSignalController],
    exports: [OneSignalService],
})
export class OneSignalModule {}
