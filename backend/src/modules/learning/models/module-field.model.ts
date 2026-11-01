import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";
import { ModuleFieldType } from "../common/constant";
import { ModuleField } from "../entities/module-field.entity";

@Table({ tableName: Entity.MODULE_FIELD })
export class ModuleFieldModel extends Model implements ModuleField {
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    moduleId: string;

    @Column({ type: DataType.STRING(50), allowNull: false })
    key: string;

    @Column({ type: DataType.STRING(255), allowNull: false })
    label: string;

    @Column({
        type: DataType.STRING,
        validate: { isIn: [Object.values(ModuleFieldType)] },
        allowNull: false,
    })
    fieldType: ModuleFieldType;

    @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
    isRequired?: boolean;

    @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
    isUnique?: boolean;

    @Column({ type: DataType.JSONB, allowNull: true })
    options?: unknown[];

    @Column({ type: DataType.JSONB, allowNull: true })
    validation?: Record<string, unknown>;

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
    sortOrder?: number;

    @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
    isActive?: boolean;
}
