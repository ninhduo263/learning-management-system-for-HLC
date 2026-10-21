import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";
import { MentoringRole, RecapReviewStatus } from "../common/constant";
import { MentoringRecap } from "../entities/mentoring-recap.entity";

@Table({ tableName: Entity.MENTORING_RECAP })
export class MentoringRecapModel extends Model implements MentoringRecap {
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    sessionId: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    memberId: string;

    @Column({
        type: DataType.STRING,
        validate: { isIn: [Object.values(MentoringRole)] },
        allowNull: false,
    })
    role: MentoringRole;

    @Column({ type: DataType.TEXT, allowNull: false })
    content: string;

    @Column({ type: DataType.DATE, allowNull: false })
    firstSubmittedAt: Date;

    @Column({ type: DataType.DATE, allowNull: false })
    lastSubmittedAt: Date;

    @Column({ type: DataType.BOOLEAN, allowNull: false })
    isLate: boolean;

    @Column({
        type: DataType.STRING,
        validate: { isIn: [Object.values(RecapReviewStatus)] },
        allowNull: false,
        defaultValue: RecapReviewStatus.PENDING,
    })
    reviewStatus?: RecapReviewStatus;

    @Column({ type: DataType.STRING(24), allowNull: true })
    reviewedBy?: string;

    @Column({ type: DataType.DATE, allowNull: true })
    reviewedAt?: Date;

    @Column({ type: DataType.TEXT, allowNull: true })
    reviewNote?: string;
}
