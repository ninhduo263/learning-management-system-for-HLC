import { StrObjectId } from "@common/constant";
import { DataPartition } from "@module/data-partition/entities/data-partition.entity";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";

@Table({ tableName: Entity.DATA_PARTITION })
export class DataPartitionModel
    extends Model<DataPartition>
    implements DataPartition
{
    @StrObjectId()
    _id: string;

    @Column({ allowNull: false, unique: true })
    ma: string;

    @Column({ type: DataType.TEXT, allowNull: false })
    name: string;
}
