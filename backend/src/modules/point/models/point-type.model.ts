import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";
import { PointCategory } from "../common/constant";
import { PointType } from "../entities/point-type.entity";

@Table({ tableName: Entity.POINT_TYPE })
export class PointTypeModel extends Model implements PointType {
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(50), allowNull: false, unique: true })
    code: string;

    @Column({ type: DataType.STRING(255), allowNull: false })
    name: string;

    @Column({
        type: DataType.STRING,
        validate: { isIn: [Object.values(PointCategory)] },
        allowNull: false,
    })
    category: PointCategory;

    @Column({ type: DataType.TEXT, allowNull: true })
    description?: string;

    @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
    isAllowance?: boolean;

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
    sortOrder?: number;

    @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
    isActive?: boolean;
}
