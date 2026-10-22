import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";

/** Lịch sử sửa hồ sơ thành viên (đặc biệt thông tin ngân hàng) để đối soát chi trả. Chỉ ghi thêm, không sửa/xóa */
@Table({ tableName: Entity.MEMBER_PROFILE_LOG, updatedAt: false })
export class MemberProfileLogModel extends Model {
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    memberId: string;

    @Column({ type: DataType.STRING(50), allowNull: false })
    field: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    oldValue?: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    newValue?: string;

    @Column({ type: DataType.STRING(24), allowNull: true })
    changedBy?: string;

    /** SELF | ADMIN */
    @Column({ type: DataType.STRING(10), allowNull: false })
    changedByRole: string;
}
