import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";

/**
 * Yêu cầu thay đổi thông tin nhạy cảm (số tài khoản, ngân hàng, CCCD): chờ Admin toàn cục (hoặc người được ủy
 * quyền) duyệt. Trong lúc chờ, mọi trang vẫn dùng thông tin chính thức cũ.
 */
@Table({ tableName: Entity.PROFILE_CHANGE_REQUEST })
export class ProfileChangeRequestModel extends Model {
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    memberId: string;

    /** [{ field, oldValue, newValue }] */
    @Column({ type: DataType.JSONB, allowNull: false, defaultValue: [] })
    changes: {
        field: string;
        oldValue: string | null;
        newValue: string | null;
    }[];

    /** PENDING | APPROVED | REJECTED | CANCELLED */
    @Column({
        type: DataType.STRING(12),
        allowNull: false,
        defaultValue: "PENDING",
    })
    status: string;

    @Column({ type: DataType.STRING(24), allowNull: true })
    requestedBy?: string;

    @Column({ type: DataType.STRING(24), allowNull: true })
    decidedBy?: string;

    @Column({ type: DataType.DATE, allowNull: true })
    decidedAt?: Date;

    @Column({ type: DataType.TEXT, allowNull: true })
    reason?: string;

    /** Duyệt thay cho ai (ủy quyền duyệt) */
    @Column({ type: DataType.STRING(255), allowNull: true })
    onBehalfOf?: string;

    /** Kỳ bắt đầu áp dụng thông tin ngân hàng mới (YYYY-MM) */
    @Column({ type: DataType.STRING(7), allowNull: true })
    effectivePeriodCode?: string;
}
