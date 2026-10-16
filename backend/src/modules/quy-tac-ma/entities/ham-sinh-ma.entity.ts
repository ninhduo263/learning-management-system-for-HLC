import { StrObjectId } from "@common/constant";
import { BaseEntity } from "@common/interface/base-entity.interface";
import { Entity } from "@module/repository";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { IsString } from "class-validator";
import { HydratedDocument } from "mongoose";

@Schema({ collection: Entity.HAM_SINH_MA })
export class HamSinhMa implements BaseEntity {
    @StrObjectId()
    _id: string;

    @IsString()
    @Prop({ unique: true })
    ten: string;

    @Prop()
    nguon: string;
}

export const HamSinhMaSchema = SchemaFactory.createForClass(HamSinhMa);
export type HamSinhMaDocument = HydratedDocument<HamSinhMa>;
