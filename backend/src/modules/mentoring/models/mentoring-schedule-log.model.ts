import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";
import { ScheduleLogAction } from "../common/constant";
import { MentoringScheduleLog } from "../entities/mentoring-schedule-log.entity";

@Table({ tableName: Entity.MENTORING_SCHEDULE_LOG })
export class MentoringScheduleLogModel
    extends Model
    implements MentoringScheduleLog
{
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    sessionId: string;

    @Column({
        type: DataType.STRING,
        validate: { isIn: [Object.values(ScheduleLogAction)] },
        allowNull: false,
    })
    action: ScheduleLogAction;

    @Column({ type: DataType.DATE, allowNull: true })
    oldStartAt?: Date;

    @Column({ type: DataType.DATE, allowNull: true })
    oldEndAt?: Date;

    @Column({ type: DataType.DATE, allowNull: true })
    newStartAt?: Date;

    @Column({ type: DataType.DATE, allowNull: true })
    newEndAt?: Date;

    @Column({ type: DataType.STRING(24), allowNull: true })
    actorUserId?: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    reason?: string;
}
