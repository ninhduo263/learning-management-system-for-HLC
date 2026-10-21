import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";
import { ModuleAssignment } from "../entities/module-assignment.entity";

@Table({ tableName: Entity.MODULE_ASSIGNMENT })
export class ModuleAssignmentModel extends Model implements ModuleAssignment {
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    moduleId: string;

    @Column({ type: DataType.STRING(24), allowNull: true })
    periodId?: string;

    @Column({ type: DataType.STRING(20), allowNull: false })
    cycleKey: string;

    @Column({ type: DataType.STRING(500), allowNull: false })
    title: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    description?: string;

    @Column({ type: DataType.DATE, allowNull: true })
    openAt?: Date;

    @Column({ type: DataType.DATE, allowNull: true })
    dueAt?: Date;

    @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
    isActive?: boolean;

    @Column({ type: DataType.STRING(24), allowNull: true })
    createdBy?: string;
}
