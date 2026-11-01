import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";
import { MentorPreference } from "../entities/mentor-preference.entity";

@Table({ tableName: Entity.MENTOR_PREFERENCE })
export class MentorPreferenceModel extends Model implements MentorPreference {
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    quarterId: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    menteeId: string;

    @Column({ type: DataType.STRING(500), allowNull: true })
    message?: string;

    @Column({ type: DataType.DATE, allowNull: false })
    submittedAt: Date;

    @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
    isLateJoiner?: boolean;
}
