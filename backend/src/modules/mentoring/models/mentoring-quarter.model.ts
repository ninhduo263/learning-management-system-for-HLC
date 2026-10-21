import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";
import { MentoringQuarterStatus } from "../common/constant";
import { MentoringQuarter } from "../entities/mentoring-quarter.entity";

@Table({ tableName: Entity.MENTORING_QUARTER })
export class MentoringQuarterModel extends Model implements MentoringQuarter {
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(6), allowNull: false, unique: true })
    code: string;

    @Column({ type: DataType.SMALLINT, allowNull: false })
    year: number;

    @Column({ type: DataType.SMALLINT, allowNull: false })
    quarter: number;

    @Column({ type: DataType.DATEONLY, allowNull: false })
    startDate: string;

    @Column({ type: DataType.DATEONLY, allowNull: false })
    endDate: string;

    @Column({ type: DataType.DATE, allowNull: false })
    preferenceOpenAt: Date;

    @Column({ type: DataType.DATE, allowNull: false })
    pairingOpenAt: Date;

    @Column({ type: DataType.DATE, allowNull: false })
    visibleAt: Date;

    @Column({
        type: DataType.STRING,
        validate: { isIn: [Object.values(MentoringQuarterStatus)] },
        allowNull: false,
        defaultValue: MentoringQuarterStatus.DRAFT,
    })
    status?: MentoringQuarterStatus;

    @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
    isLocked?: boolean;

    @Column({ type: DataType.DATE, allowNull: true })
    lockedAt?: Date;

    @Column({ type: DataType.STRING(24), allowNull: true })
    lockedBy?: string;

    @Column({ type: DataType.STRING(24), allowNull: true })
    createdBy?: string;
}
