import { StrObjectId } from "@common/constant";
import { BaseEntity } from "@common/interface/base-entity.interface";
import { Entity } from "@module/repository";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiHideProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { HydratedDocument } from "mongoose";
import { DataPartition } from "./data-partition.entity";

@Schema({
    collection: Entity.DATA_PARTITION_USER,
    timestamps: true,
    toJSON: { virtuals: true },
})
export class DataPartitionUser implements BaseEntity {
    @StrObjectId()
    _id: string;

    @Prop({ required: true, index: true })
    @IsString()
    dataPartitionCode: string;

    @ApiHideProperty()
    dataPartition?: DataPartition;

    @Prop({ required: true, index: true })
    @IsString()
    userId: string;

    @IsString()
    @IsOptional()
    @Prop({})
    userFullname?: string;

    @IsString()
    @IsOptional()
    @Prop({})
    userCode?: string;

    @IsString()
    @IsOptional()
    @Prop()
    userEmail?: string;
}

export const DataPartitionUserSchema =
    SchemaFactory.createForClass(DataPartitionUser);

DataPartitionUserSchema.index(
    { dataPartitionCode: 1, userId: 1 },
    { unique: true },
);
DataPartitionUserSchema.virtual("dataPartition", {
    ref: Entity.DATA_PARTITION,
    localField: "dataPartitionCode",
    foreignField: "ma",
    justOne: true,
});

export type DataPartitionUserDocument = HydratedDocument<DataPartitionUser>;
