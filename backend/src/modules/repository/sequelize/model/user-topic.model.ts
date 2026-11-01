import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { TopicSubscription } from "@module/topic/entities/topic-subscription.entity";
import { UserTopic } from "@module/topic/entities/user-topic.entity";
import { User } from "@sentry/types";
import {
    BelongsTo,
    Column,
    ForeignKey,
    Model,
    Table,
} from "sequelize-typescript";
import { UserModel } from "./user.model";

@Table({ tableName: Entity.USER_TOPIC })
export class UserTopicModel extends Model implements UserTopic {
    @StrObjectId()
    _id: string;

    @Column({})
    @ForeignKey(() => UserModel)
    user: string;

    @BelongsTo(() => UserModel)
    userObj: User;

    // @Column
    subscriptions: TopicSubscription[];
}
