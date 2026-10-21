import { StrObjectId } from "@common/constant";
import { NumberColumn } from "@common/decorator/sql-column.decorator";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";
import { PointRuleKind, PointSourceType } from "../common/constant";
import { TargetMemberType } from "@module/member/common/constant";
import { PointRule } from "../entities/point-rule.entity";

@Table({ tableName: Entity.POINT_RULE })
export class PointRuleModel extends Model implements PointRule {
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(50), allowNull: false, unique: true })
    code: string;

    @Column({ type: DataType.STRING(255), allowNull: false })
    name: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    pointTypeId: string;

    @Column({
        type: DataType.STRING,
        validate: { isIn: [Object.values(PointRuleKind)] },
        allowNull: false,
    })
    ruleKind: PointRuleKind;

    @Column({
        type: DataType.STRING,
        validate: { isIn: [Object.values(PointSourceType)] },
        allowNull: false,
    })
    sourceType: PointSourceType;

    @Column({
        type: DataType.STRING,
        validate: { isIn: [Object.values(TargetMemberType)] },
        allowNull: false,
        defaultValue: TargetMemberType.MENTEE,
    })
    targetMemberType?: TargetMemberType;

    @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {} })
    conditions?: Record<string, unknown>;

    @NumberColumn({ type: DataType.DECIMAL(6, 2), allowNull: false })
    points: number;

    @Column({ type: DataType.STRING(50), allowNull: true })
    exclusiveGroup?: string;

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
    priority?: number;

    @NumberColumn({ type: DataType.DECIMAL(6, 2), allowNull: true })
    maxPointsPerPeriod?: number;

    @Column({ type: DataType.DATEONLY, allowNull: true })
    effectiveFrom?: string;

    @Column({ type: DataType.DATEONLY, allowNull: true })
    effectiveTo?: string;

    @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
    isActive?: boolean;
}
