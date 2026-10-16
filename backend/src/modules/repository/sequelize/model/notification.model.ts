import { StrObjectId } from "@common/constant";
import { NotificationReceiverType } from "@module/notification/common/constant";
import { Notification } from "@module/notification/entities/notification.entity";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";

@Table({ tableName: Entity.NOTIFICATION })
export class NotificationModel extends Model implements Notification {
    @StrObjectId()
    _id: string;

    @Column({ allowNull: false })
    title: string;

    @Column({ allowNull: false })
    senderName: string;

    @Column
    sender?: string;

    @Column
    description?: string;

    @Column
    content?: string;

    @Column
    imageUrl?: string;

    @Column({ type: DataType.JSON })
    data?: any;
    @Column({
        allowNull: false,
        type: DataType.ENUM(...Object.values(NotificationReceiverType)),
    })
    receiverType: NotificationReceiverType;
    topics?: string[];
    users?: string[];
}
