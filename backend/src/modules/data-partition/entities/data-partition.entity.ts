import { StrObjectId } from "@common/constant";
import { BaseEntity } from "@common/interface/base-entity.interface";
import { Entity } from "@module/repository";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { IsString } from "class-validator";
import { HydratedDocument } from "mongoose";

@Schema({ collection: Entity.DATA_PARTITION, timestamps: true })
export class DataPartition implements BaseEntity {
    @StrObjectId()
    _id: string;

    @IsString()
    @Prop({ unique: true, required: true })
    ma: string;

    @IsString()
    @Prop({ required: true })
    name: string;
}

export const DataPartitionSchema = SchemaFactory.createForClass(DataPartition);
export type DataPartitionDocument = HydratedDocument<DataPartition>;
