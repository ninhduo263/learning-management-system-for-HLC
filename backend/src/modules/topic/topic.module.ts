import { UserTopicSqlRepository } from "@module/topic/repository/user-topic-sql.repository";
import { TopicSqlRepository } from "@module/topic/repository/topic-sql.repository";
import { Entity } from "@module/repository";
import { RepositoryProvider } from "@module/repository/common/repository";
import { Module } from "@nestjs/common";
import { TopicService } from "./topic.service";

@Module({
    providers: [
        TopicService,
        RepositoryProvider(Entity.TOPIC, TopicSqlRepository),
        RepositoryProvider(Entity.USER_TOPIC, UserTopicSqlRepository),
    ],
})
export class TopicModule {}
