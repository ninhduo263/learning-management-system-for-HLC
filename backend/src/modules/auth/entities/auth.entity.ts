import { StrObjectId } from "@common/constant";
import { EntityDefinition } from "@common/constant/class/entity-definition";
import { BaseEntity } from "@common/interface/base-entity.interface";
import { Entity } from "@module/repository";
import { User } from "@module/user/entities/user.entity";
import { Prop, Schema } from "@nestjs/mongoose";
import {
    IsEnum,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
} from "class-validator";
import mongoose, { HydratedDocument } from "mongoose";
import { ClientPlatform } from "../common/constant";

@Schema({
    collection: Entity.AUTH,
    timestamps: true,
})
export class Auth implements BaseEntity {
    @StrObjectId()
    _id: string;

    @Prop()
    @IsString()
    @EntityDefinition.field({ label: "IP" })
    ip: string;

    @Prop({ type: String, enum: Object.values(ClientPlatform) })
    @IsEnum(ClientPlatform)
    @EntityDefinition.field({ label: "Client platform" })
    platform: ClientPlatform;

    @Prop({ type: mongoose.Schema.Types.Mixed })
    @IsObject()
    @EntityDefinition.field({ label: "User agent" })
    userAgent: any;

    @Prop()
    @IsString()
    @EntityDefinition.field({ label: "Origin" })
    origin: string;

    @Prop({ index: true, ref: Entity.USER })
    @IsString()
    @EntityDefinition.field({ label: "User ID" })
    user: string;

    @EntityDefinition.field({ label: "User Info", propertyTarget: User })
    userInfo?: User;

    @Prop()
    @IsOptional()
    @IsString()
    @EntityDefinition.field({ label: "jti" })
    jti?: string;

    @Prop()
    @IsOptional()
    @IsNumber()
    @EntityDefinition.field({ label: "Expires at" })
    exp?: number;
}

export type AuthDocument = HydratedDocument<Auth>;
