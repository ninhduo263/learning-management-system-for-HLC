import { Entity } from "@module/repository";
import { RepositoryProvider } from "@module/repository/common/repository";
import { Module } from "@nestjs/common";
import { TopicMongoRepository } from "./repository/topic-mongo.repository";
import { UserTopicMongoRepository } from "./repository/user-topic-mongo.repository";
import { TopicService } from "./topic.service";

@Module({
    providers: [
        TopicService,
        RepositoryProvider(Entity.TOPIC, TopicMongoRepository),
        RepositoryProvider(Entity.USER_TOPIC, UserTopicMongoRepository),
    ],
})
export class TopicModule {}
