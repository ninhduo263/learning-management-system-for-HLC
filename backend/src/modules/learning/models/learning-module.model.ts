import { StrObjectId } from "@common/constant";
import { NumberColumn } from "@common/decorator/sql-column.decorator";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";
import { TargetMemberType } from "@module/member/common/constant";
import { CycleType, LibraryType } from "../common/constant";
import { LearningModule } from "../entities/learning-module.entity";

@Table({ tableName: Entity.LEARNING_MODULE })
export class LearningModuleModel extends Model implements LearningModule {
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(50), allowNull: false, unique: true })
    code: string;

    @Column({ type: DataType.STRING(255), allowNull: false })
    name: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    description?: string;

    @Column({ type: DataType.STRING(24), allowNull: true })
    departmentId?: string;

    @Column({
        type: DataType.STRING,
        validate: { isIn: [Object.values(TargetMemberType)] },
        allowNull: false,
        defaultValue: TargetMemberType.MENTEE,
    })
    targetMemberType?: TargetMemberType;

    @Column({
        type: DataType.STRING,
        validate: { isIn: [Object.values(CycleType)] },
        allowNull: false,
    })
    cycleType: CycleType;

    @Column({ type: DataType.SMALLINT, allowNull: false, defaultValue: 1 })
    minSubmissionsPerCycle?: number;

    @Column({ type: DataType.SMALLINT, allowNull: true })
    maxSubmissionsPerCycle?: number;

    @Column({
        type: DataType.STRING,
        validate: { isIn: [Object.values(LibraryType)] },
        allowNull: true,
    })
    libraryType?: LibraryType;

    @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
    requireReview?: boolean;

    @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
    enableScoring?: boolean;

    @NumberColumn({
        type: DataType.DECIMAL(6, 2),
        allowNull: false,
        defaultValue: 100,
    })
    maxScore?: number;

    @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
    allowLateSubmission?: boolean;

    @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {} })
    settings?: Record<string, unknown>;

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
    sortOrder?: number;

    /** ALL = mọi thành viên đúng đối tượng; SELECTED = chỉ người / nhóm được gán (ModuleAudience) */
    @Column({
        type: DataType.STRING(10),
        allowNull: false,
        defaultValue: "ALL",
    })
    audienceMode?: string;

    @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
    isActive?: boolean;

    @Column({ type: DataType.STRING(24), allowNull: true })
    createdBy?: string;
}
