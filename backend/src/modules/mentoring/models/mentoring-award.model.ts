import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";
import { MentoringAward } from "../entities/mentoring-award.entity";

@Table({ tableName: Entity.MENTORING_AWARD })
export class MentoringAwardModel extends Model implements MentoringAward {
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    periodId: string;

    @Column({ type: DataType.STRING(24), allowNull: false, unique: true })
    sessionId: string;

    @Column({ type: DataType.SMALLINT, allowNull: false })
    rank: number;

    @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {} })
    rankingBasis?: Record<string, unknown>;

    @Column({ type: DataType.STRING(24), allowNull: true })
    decidedBy?: string;

    @Column({
        type: DataType.DATE,
        allowNull: false,
        defaultValue: DataType.NOW,
    })
    decidedAt?: Date;
}
