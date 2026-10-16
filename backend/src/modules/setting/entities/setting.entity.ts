import { EntityDefinition } from "@common/constant/class/entity-definition";
import { BaseEntity } from "@common/interface/base-entity.interface";
import { Entity } from "@module/repository";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { IsString } from "class-validator";
import mongoose from "mongoose";

@Schema({ collection: Entity.SETTING, timestamps: true })
export class Setting implements BaseEntity {
    _id: string;

    @IsString()
    @Prop({ required: true, unique: true })
    @EntityDefinition.field({ label: "Mã" })
    key: string;

    @IsString()
    @Prop({ required: true, type: mongoose.Schema.Types.Mixed })
    @EntityDefinition.field({ label: "Giá trị" })
    value: Record<string, any>;
}

export type SettingDocument = mongoose.HydratedDocument<Setting>;
export const SettingSchema = SchemaFactory.createForClass(Setting);
