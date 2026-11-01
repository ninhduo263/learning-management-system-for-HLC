import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";

/** Bản nháp hồ sơ: chỉ chính chủ thấy, chưa ảnh hưởng trang khác. Mỗi thành viên 1 bản nháp */
@Table({ tableName: Entity.PROFILE_DRAFT })
export class ProfileDraftModel extends Model {
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(24), allowNull: false, unique: true })
    memberId: string;

    @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {} })
    data: Record<string, unknown>;
}
