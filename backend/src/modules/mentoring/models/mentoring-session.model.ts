import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";
import { MentoringSessionStatus } from "../common/constant";
import { MentoringSession } from "../entities/mentoring-session.entity";

@Table({ tableName: Entity.MENTORING_SESSION })
export class MentoringSessionModel extends Model implements MentoringSession {
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    pairId: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    periodId: string;

    @Column({ type: DataType.SMALLINT, allowNull: false })
    monthIndex: number;

    @Column({ type: DataType.STRING(64), allowNull: false })
    code: string;

    @Column({
        type: DataType.STRING,
        validate: { isIn: [Object.values(MentoringSessionStatus)] },
        allowNull: false,
        defaultValue: MentoringSessionStatus.ACTIVE,
    })
    status?: MentoringSessionStatus;

    @Column({ type: DataType.DATE, allowNull: true })
    scheduledStartAt?: Date;

    @Column({ type: DataType.DATE, allowNull: true })
    scheduledEndAt?: Date;

    @Column({ type: DataType.DATE, allowNull: true })
    firstScheduledStartAt?: Date;

    @Column({ type: DataType.STRING(255), allowNull: true })
    location?: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    meetingLink?: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    scheduleNote?: string;

    @Column({ type: DataType.STRING(24), allowNull: true })
    scheduleSubmittedBy?: string;

    @Column({ type: DataType.DATE, allowNull: true })
    scheduleSubmittedAt?: Date;

    @Column({ type: DataType.DATE, allowNull: true })
    recapDeadlineAt?: Date;

    @Column({ type: DataType.JSONB, allowNull: true })
    importedStatus?: Record<string, unknown>;
}
