import { StrObjectId } from "@common/constant";
import { BaseEntity } from "@common/interface/base-entity.interface";
import { Entity } from "@module/repository";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { IsString } from "class-validator";
import { HydratedDocument } from "mongoose";

@Schema({
    collection: Entity.ONE_SIGNAL_USER,
    timestamps: { createdAt: true, updatedAt: false },
})
export class OneSignalUser implements BaseEntity {
    @StrObjectId()
    _id: string;

    @IsString()
    @Prop({ index: true, required: true })
    playerId: string;

    @Prop({ index: true, ref: Entity.AUTH, required: true })
    auth: string;

    @Prop({ index: true, ref: Entity.USER, required: true })
    user: string;

    @Prop()
    inactiveAt?: Date;

    @Prop({ expires: 0 })
    expireAt?: Date;
}

export type OneSignalUserDocument = HydratedDocument<OneSignalUser>;
export const OneSignalUserSchema = SchemaFactory.createForClass(OneSignalUser);
