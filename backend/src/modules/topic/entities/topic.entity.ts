import { StrObjectId } from "@common/constant";
import { BaseEntity } from "@common/interface/base-entity.interface";
import { Entity } from "@module/repository";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

@Schema({ collection: Entity.TOPIC })
export class Topic implements BaseEntity {
    @StrObjectId()
    _id: string;

    @Prop({ unique: true, required: true })
    key: string;

    @Prop({ required: true })
    name: string;

    @Prop()
    lastNotifyAt?: Date;
}

export type TopicDocument = HydratedDocument<Topic>;
export const TopicSchema = SchemaFactory.createForClass(Topic);
