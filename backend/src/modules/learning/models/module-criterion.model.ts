import { StrObjectId } from "@common/constant";
import { NumberColumn } from "@common/decorator/sql-column.decorator";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";
import { ModuleCriterion } from "../entities/module-criterion.entity";

@Table({ tableName: Entity.MODULE_CRITERION })
export class ModuleCriterionModel extends Model implements ModuleCriterion {
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    moduleId: string;

    @Column({ type: DataType.STRING(255), allowNull: false })
    name: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    description?: string;

    @NumberColumn({ type: DataType.DECIMAL(6, 2), allowNull: false })
    maxScore: number;

    @NumberColumn({
        type: DataType.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 1,
    })
    weight?: number;

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
    sortOrder?: number;
}
