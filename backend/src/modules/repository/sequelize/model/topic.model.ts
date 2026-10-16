import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Topic } from "@module/topic/entities/topic.entity";
import { Column, Model, Table } from "sequelize-typescript";

@Table({ tableName: Entity.TOPIC })
export default class TopicModel extends Model implements Topic {
    @StrObjectId()
    _id: string;

    @Column({ unique: true, allowNull: false })
    key: string;

    @Column({ allowNull: false })
    name: string;

    @Column
    lastNotifyAt?: Date;
}
