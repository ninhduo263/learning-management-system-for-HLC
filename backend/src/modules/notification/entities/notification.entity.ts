import { StrObjectId } from "@common/constant";
import { BaseEntity } from "@common/interface/base-entity.interface";
import { Entity } from "@module/repository";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { IsEnum, IsOptional, IsString } from "class-validator";
import mongoose, { HydratedDocument } from "mongoose";
import { NotificationReceiverType } from "../common/constant";

@Schema({
    collection: Entity.NOTIFICATION,
})
export class Notification implements BaseEntity {
    @StrObjectId()
    _id: string;

    @IsString()
    @Prop({ required: true })
    title: string;

    @IsString()
    @Prop({ required: true })
    senderName: string;

    @IsString()
    @Prop()
    @IsOptional()
    sender?: string;

    @IsString()
    @Prop()
    @IsOptional()
    description?: string;

    @IsString()
    @Prop()
    @IsOptional()
    content?: string;

    @IsString()
    @Prop()
    @IsOptional()
    imageUrl?: string;

    @IsOptional()
    @Prop({ type: mongoose.Schema.Types.Mixed })
    data?: any;

    @IsEnum(NotificationReceiverType)
    @Prop({
        required: true,
        type: String,
        enum: Object.values(NotificationReceiverType),
    })
    receiverType: NotificationReceiverType;

    @IsString({ each: true })
    @IsOptional()
    @Prop([{ type: String, ref: Entity.TOPIC }])
    topics?: string[];

    @IsString({ each: true })
    @IsOptional()
    @Prop([{ type: String, ref: Entity.USER }])
    users?: string[];

    @Prop({ default: () => new Date() })
    createdAt?: Date;
}

export type NotificationDocument = HydratedDocument<Notification>;
export const NotificationSchema = SchemaFactory.createForClass(Notification);
