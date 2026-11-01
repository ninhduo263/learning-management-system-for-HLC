import { MAX_TOPIC_SUBSCRIPTION } from "@common/constant";
import { ApiError } from "@config/exception/api-error";
import { Entity } from "@module/repository";
import { InjectRepository } from "@module/repository/common/repository";
import { TopicRepository } from "@module/topic/repository/topic-repository.interface";
import { UserTopicRepository } from "@module/topic/repository/user-topic-repository.interface";
import { User } from "@module/user/entities/user.entity";
import { Injectable } from "@nestjs/common";
import { TopicSubscription } from "./entities/topic-subscription.entity";

@Injectable()
export class TopicService {
    constructor(
        @InjectRepository(Entity.TOPIC)
        private readonly topicRepository: TopicRepository,
        @InjectRepository(Entity.USER_TOPIC)
        private readonly userTopicRepository: UserTopicRepository,
    ) {}

    async userSubscribeTopic(user: User, subscription: TopicSubscription) {
        const topic = await this.topicRepository.getById(subscription.topic);
        if (!topic) {
            throw ApiError.NotFound("error-topic-not-found");
        }

        const existSubscription =
            await this.userTopicRepository.existSubscription(
                user._id,
                subscription.topic,
            );
        if (existSubscription) {
            throw ApiError.Conflict("error-topic-subscribed", {
                topic: topic.name,
            });
        }

        const existMaxSubscription =
            await this.userTopicRepository.existMaxSubscription(
                user._id,
                MAX_TOPIC_SUBSCRIPTION,
            );
        if (existMaxSubscription) {
            throw ApiError.BadRequest("error-topic-subscription-limit-exceed", {
                total: String(MAX_TOPIC_SUBSCRIPTION),
            });
        }
        await this.userTopicRepository.createSubscription(
            user._id,
            subscription,
        );
        return subscription;
    }
}
