import { StrObjectId } from "@common/constant";
import { BaseEntity } from "@common/interface/base-entity.interface";
import {
    BelongsTo,
    Column,
    DataType,
    Model,
    Table,
    HasMany,
} from "sequelize-typescript";
import { Col } from "sequelize/types/utils";
import { EventLog } from "@module/event-log/entities/event-log.entity";
@Table({
    tableName: "events",
    timestamps: true,
})
export class Event extends Model<Event> implements BaseEntity {
    @StrObjectId()
    _id: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    ten_su_kien: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    dia_diem: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    ngay_bat_dau: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    ngay_ket_thuc: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    ghi_chu: string;

    @HasMany(() => EventLog)
    eventLogs: EventLog[];
}
