import { Entity } from "@module/repository";
import { MongoRepository } from "@module/repository/mongo/mongo.repository";
import { UserTopicRepository } from "@module/topic/repository/user-topic-repository.interface";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { TopicSubscription } from "../entities/topic-subscription.entity";
import { UserTopic } from "../entities/user-topic.entity";

export class UserTopicMongoRepository
    extends MongoRepository<UserTopic>
    implements UserTopicRepository
{
    constructor(
        @InjectModel(Entity.USER_TOPIC)
        private readonly userTopicModel: Model<UserTopic>,
    ) {
        super(userTopicModel);
    }

    async bulkUserSubscribeTopic(
        batch: Array<Pick<UserTopic, "user"> & TopicSubscription>,
    ): Promise<void> {
        const distinctUserIds = [...new Set(batch.map((ts) => ts.user))];

        const unorderBulk =
            this.userTopicModel.collection.initializeUnorderedBulkOp();
        distinctUserIds.forEach((user) => {
            unorderBulk.find({ user }).upsert().updateOne({});
        });
        await unorderBulk.execute();

        const orderBulk =
            this.userTopicModel.collection.initializeOrderedBulkOp();
        batch.forEach((ts) => {
            const { user, ...subscription } = ts;
            orderBulk
                .find({
                    user,
                    "subscriptions.topic": { $ne: ts.topic },
                })
                .updateOne({ $push: { subscriptions: subscription } });
        });
        await orderBulk.execute();
    }

    async existMaxSubscription(
        user: string,
        maxLength: number,
    ): Promise<boolean> {
        return this.exists({
            user,
            [`subscriptions.${maxLength}`]: { $exists: true },
        });
    }

    async createSubscription(
        user: string,
        subscription: TopicSubscription,
    ): Promise<UserTopic> {
        return this.updateOne(
            { user },
            { $push: { subscriptions: subscription } },
            { upsert: true },
        );
    }

    async existSubscription(user: string, topic: string): Promise<boolean> {
        return this.exists({
            user,
            "subscriptions.topic": topic,
        });
    }
}
