import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";

/**
 * Người / nhóm được gán module học tập (module có audienceMode = SELECTED).
 * Một dòng là 1 thành viên (memberId) hoặc 1 nhóm (groupId: mọi thành viên hiện tại của nhóm).
 */
@Table({ tableName: Entity.MODULE_AUDIENCE })
export class ModuleAudienceModel extends Model {
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    moduleId: string;

    @Column({ type: DataType.STRING(24), allowNull: true })
    memberId?: string;

    @Column({ type: DataType.STRING(24), allowNull: true })
    groupId?: string;

    @Column({ type: DataType.STRING(24), allowNull: true })
    addedBy?: string;
}
