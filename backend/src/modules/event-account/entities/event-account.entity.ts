import { StrObjectId } from "@common/constant";
import { BaseEntity } from "@common/interface/base-entity.interface";
import { Column, DataType, Model, Table } from "sequelize-typescript";

@Table({
    tableName: "event_accounts",
    timestamps: true,
})
export class EventAccount extends Model<EventAccount> implements BaseEntity {
    @StrObjectId()
    _id: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true,
    })
    username: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    password: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    device_id: string;
}
