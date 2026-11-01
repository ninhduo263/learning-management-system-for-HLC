import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";

/**
 * Nhật ký thao tác quản trị (xóa nhóm, xóa vai trò, gỡ chức vụ, xuất dữ liệu cá nhân, ủy quyền,
 * thao tác làm thay...). Chỉ ghi thêm, không sửa / xóa.
 */
@Table({ tableName: Entity.ACTIVITY_LOG, updatedAt: false })
export class ActivityLogModel extends Model {
    @StrObjectId()
    _id: string;

    /** ORGANIZATION | ROLE | MEMBER | POINT | FUND | MENTORING | LEARNING | DELEGATION */
    @Column({ type: DataType.STRING(20), allowNull: false })
    module: string;

    /** Mã thao tác, ví dụ GROUP_DELETE, ROLE_DELETE, ASSIGNMENT_END, MEMBER_EXPORT */
    @Column({ type: DataType.STRING(40), allowNull: false })
    action: string;

    @Column({ type: DataType.STRING(24), allowNull: true })
    targetId?: string;

    @Column({ type: DataType.STRING(255), allowNull: true })
    targetName?: string;

    /** Mô tả dễ đọc bằng tiếng Việt */
    @Column({ type: DataType.TEXT, allowNull: false })
    summary: string;

    @Column({ type: DataType.JSONB, allowNull: true })
    detail?: Record<string, unknown>;

    @Column({ type: DataType.STRING(24), allowNull: true })
    actorUserId?: string;

    @Column({ type: DataType.STRING(255), allowNull: true })
    actorName?: string;

    /** Thao tác làm thay (ủy quyền): người được làm thay */
    @Column({ type: DataType.STRING(24), allowNull: true })
    onBehalfOfMemberId?: string;

    @Column({ type: DataType.STRING(255), allowNull: true })
    onBehalfOfName?: string;
}
