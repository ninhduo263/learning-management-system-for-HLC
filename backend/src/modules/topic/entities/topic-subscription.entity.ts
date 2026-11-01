import { Entity } from "@module/repository";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose from "mongoose";

@Schema({ _id: false })
export class TopicSubscription {
    @Prop({ required: true, ref: Entity.TOPIC })
    topic: string;

    @Prop({ required: true })
    joinedAt: Date;

    @Prop({ type: mongoose.Schema.Types.Mixed })
    info?: any;
}

export const TopicSubscriptionSchema =
    SchemaFactory.createForClass(TopicSubscription);
