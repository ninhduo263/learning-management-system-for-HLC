import { StrObjectId } from "@common/constant";
import { BaseEntity } from "@common/interface/base-entity.interface";
import { all } from "axios";
import {
    Column,
    DataType,
    Model,
    Table,
    BelongsTo,
    ForeignKey,
} from "sequelize-typescript";
import { Event } from "@module/event/entities/event.entity";

@Table({
    tableName: "event_logs",
    timestamps: true,
})
export class EventLog extends Model<EventLog> implements BaseEntity {
    @StrObjectId()
    _id: string;

    @ForeignKey(() => Event)
    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    eventId: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true,
    })
    identityCode: string;
    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true,
    })
    name: string;
    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    gender: string;
    @Column({
        type: DataType.BOOLEAN,
        allowNull: true,
        defaultValue: false,
    })
    isCheckedIn: boolean;
    @Column({
        type: DataType.BOOLEAN,
        allowNull: true,
        defaultValue: false,
    })
    isCheckedOut: boolean;
    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    checkInTime: string;
    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    checkOutTime: string;

    @BelongsTo(() => Event)
    event: Event;
}
