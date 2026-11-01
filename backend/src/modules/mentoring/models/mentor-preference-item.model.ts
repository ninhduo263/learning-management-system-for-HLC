import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";
import { MentorPreferenceItem } from "../entities/mentor-preference-item.entity";

@Table({ tableName: Entity.MENTOR_PREFERENCE_ITEM })
export class MentorPreferenceItemModel
    extends Model
    implements MentorPreferenceItem
{
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    preferenceId: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    mentorId: string;

    @Column({ type: DataType.SMALLINT, allowNull: false })
    priority: number;
}
