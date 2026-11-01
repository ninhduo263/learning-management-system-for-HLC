import { UserTopicModel } from "@module/repository/sequelize/model/user-topic.model";
import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { ModelCtor } from "sequelize-typescript";
import { TopicSubscription } from "../entities/topic-subscription.entity";
import { UserTopic } from "../entities/user-topic.entity";
import { UserTopicRepository } from "./user-topic-repository.interface";

export class UserTopicSqlRepository
    extends SqlRepository<UserTopic>
    implements UserTopicRepository
{
    constructor(
        @InjectModel(UserTopicModel)
        private readonly topicModel: ModelCtor<UserTopicModel>,
    ) {
        super(topicModel);
    }
    bulkUserSubscribeTopic(
        batch: (Pick<UserTopic, "user"> & TopicSubscription)[],
    ): Promise<void> {
        throw new Error("Method not implemented.");
    }
    existMaxSubscription(user: string, maxLength: number): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
    existSubscription(user: string, topic: string): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
    createSubscription(
        user: string,
        subscription: TopicSubscription,
    ): Promise<UserTopic> {
        throw new Error("Method not implemented.");
    }
}
