import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";

/**
 * Ủy quyền tạm thời trong 1 nhóm (ví dụ Leader vắng thì Phó nhóm thay): người nhận chỉ có các quyền
 * được chọn, trong phạm vi nhóm của người ủy quyền, từ startDate đến endDate (tính cả 2 đầu).
 */
@Table({ tableName: Entity.GROUP_DELEGATION })
export class GroupDelegationModel extends Model {
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    groupId: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    fromMemberId: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    toMemberId: string;

    /** Tập con quyền của người ủy quyền trong nhóm (RolePermission) */
    @Column({ type: DataType.JSONB, allowNull: false, defaultValue: [] })
    permissions: string[];

    @Column({ type: DataType.DATEONLY, allowNull: false })
    startDate: string;

    @Column({ type: DataType.DATEONLY, allowNull: false })
    endDate: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    reason?: string;

    @Column({ type: DataType.STRING(24), allowNull: true })
    createdBy?: string;

    @Column({ type: DataType.DATE, allowNull: true })
    revokedAt?: Date;

    @Column({ type: DataType.STRING(24), allowNull: true })
    revokedBy?: string;
}
