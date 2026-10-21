import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";
import { MentoringPairSource, MentoringPairStatus } from "../common/constant";
import { MentoringPair } from "../entities/mentoring-pair.entity";

@Table({ tableName: Entity.MENTORING_PAIR })
export class MentoringPairModel extends Model implements MentoringPair {
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    quarterId: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    mentorId: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    menteeId: string;

    @Column({ type: DataType.STRING(64), allowNull: false })
    code: string;

    @Column({
        type: DataType.STRING,
        validate: { isIn: [Object.values(MentoringPairStatus)] },
        allowNull: false,
        defaultValue: MentoringPairStatus.ACTIVE,
    })
    status?: MentoringPairStatus;

    @Column({
        type: DataType.STRING,
        validate: { isIn: [Object.values(MentoringPairSource)] },
        allowNull: false,
        defaultValue: MentoringPairSource.MANUAL,
    })
    source?: MentoringPairSource;

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
    sortOrder?: number;

    @Column({ type: DataType.TEXT, allowNull: true })
    note?: string;

    @Column({ type: DataType.STRING(24), allowNull: true })
    createdBy?: string;
}
