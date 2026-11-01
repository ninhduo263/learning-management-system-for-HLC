import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";
import { AdminScope } from "../common/constant";
import { AdminPermission } from "../entities/admin-permission.entity";

@Table({ tableName: Entity.ADMIN_PERMISSION })
export class AdminPermissionModel extends Model implements AdminPermission {
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    userId: string;

    @Column({
        type: DataType.STRING,
        validate: { isIn: [Object.values(AdminScope)] },
        allowNull: false,
    })
    scope: AdminScope;

    @Column({ type: DataType.STRING(24), allowNull: true })
    moduleId?: string;

    @Column({ type: DataType.STRING(24), allowNull: true })
    grantedBy?: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    note?: string;
}
