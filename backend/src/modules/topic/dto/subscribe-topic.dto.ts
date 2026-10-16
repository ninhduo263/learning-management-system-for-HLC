import { PickType } from "@nestjs/swagger";
import { TopicSubscription } from "../entities/topic-subscription.entity";

export class SubscribeTopicDto extends PickType(TopicSubscription, ["topic"]) {}
