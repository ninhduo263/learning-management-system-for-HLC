import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";
import { DepartmentType, GroupKind } from "../common/constant";
import { Department } from "../entities/department.entity";

@Table({ tableName: Entity.DEPARTMENT })
export class DepartmentModel extends Model implements Department {
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(50), allowNull: false, unique: true })
    code: string;

    @Column({ type: DataType.STRING(255), allowNull: false })
    name: string;

    @Column({
        type: DataType.STRING,
        validate: { isIn: [Object.values(DepartmentType)] },
        allowNull: false,
        defaultValue: DepartmentType.OTHER,
    })
    type?: DepartmentType;

    @Column({ type: DataType.STRING(24), allowNull: true })
    parentId?: string;

    @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
    isActive?: boolean;

    /** Nhóm (type GROUP): Phó nhóm được chấm recap / duyệt quỹ độc lập như Leader */
    @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
    deputyCanReview?: boolean;

    /** Nhóm (type GROUP): MENTEE = nhóm MTE, FUND = nhóm HLC Fund của MTO */
    @Column({
        type: DataType.STRING(10),
        allowNull: false,
        defaultValue: GroupKind.MENTEE,
    })
    groupKind?: GroupKind;
}
