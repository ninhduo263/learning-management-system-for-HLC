import { StrObjectId } from "@common/constant";
import { DataPartitionUser } from "@module/data-partition/entities/data-partition-user.entity";
import { DataPartition } from "@module/data-partition/entities/data-partition.entity";
import { Entity } from "@module/repository";
import {
    BelongsTo,
    Column,
    ForeignKey,
    Model,
    Table,
} from "sequelize-typescript";
import { DataPartitionModel } from "./data-partition.model";

@Table({
    tableName: Entity.DATA_PARTITION_USER,
    indexes: [
        { fields: ["userId"] },
        { fields: ["dataPartitionCode"] },
        { fields: ["userId", "dataPartitionCode"], unique: true },
    ],
})
export class DataPartitionUserModel extends Model implements DataPartitionUser {
    @StrObjectId()
    _id: string;

    @Column
    @ForeignKey(() => DataPartitionModel)
    dataPartitionCode: string;

    @BelongsTo(() => DataPartitionModel, {
        targetKey: "ma",
        foreignKey: "dataPartitionCode",
    })
    dataPartition?: DataPartition;

    @Column
    userId: string;

    @Column
    userFullname?: string;

    @Column
    userCode?: string;

    @Column
    userEmail?: string;
}
