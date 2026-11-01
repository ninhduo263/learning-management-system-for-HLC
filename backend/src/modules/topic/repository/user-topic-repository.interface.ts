import { BaseRepository } from "@module/repository/common/base-repository.interface";
import { TopicSubscription } from "../entities/topic-subscription.entity";
import { UserTopic } from "../entities/user-topic.entity";

export interface UserTopicRepository extends BaseRepository<UserTopic> {
    bulkUserSubscribeTopic(
        batch: Array<Pick<UserTopic, "user"> & TopicSubscription>,
    ): Promise<void>;

    existMaxSubscription(user: string, maxLength: number): Promise<boolean>;
    existSubscription(user: string, topic: string): Promise<boolean>;

    createSubscription(
        user: string,
        subscription: TopicSubscription,
    ): Promise<UserTopic>;
}
