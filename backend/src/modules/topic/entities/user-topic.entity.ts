import { StrObjectId } from "@common/constant";
import { BaseEntity } from "@common/interface/base-entity.interface";
import { Entity } from "@module/repository";
import { Prop, raw, Schema, SchemaFactory } from "@nestjs/mongoose";
import {
    TopicSubscription,
    TopicSubscriptionSchema,
} from "./topic-subscription.entity";

@Schema({ collection: Entity.USER_TOPIC })
export class UserTopic implements BaseEntity {
    @StrObjectId()
    _id: string;

    @Prop({ required: true, ref: Entity.USER, index: true })
    user: string;

    @Prop(raw([{ type: TopicSubscriptionSchema }]))
    subscriptions: TopicSubscription[];
}

export const UserTopicSchema = SchemaFactory.createForClass(UserTopic);
UserTopicSchema.index({ user: 1, "subscriptions.topic": 1 });
