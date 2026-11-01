import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";

/**
 * Danh mục đơn vị hành chính cấp tỉnh (34 tỉnh, thành phố sau sáp nhập 2025).
 * Hồ sơ lưu `code` (không đổi), nên đổi tên / gộp sau này không làm hỏng dữ liệu đã lưu.
 */
@Table({ tableName: Entity.PROVINCE })
export class ProvinceModel extends Model {
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(30), allowNull: false, unique: true })
    code: string;

    @Column({ type: DataType.STRING(100), allowNull: false })
    name: string;

    /** Tên cũ / cách viết khác (kể cả các tỉnh cũ đã sáp nhập) để quy đổi dữ liệu nhập tự do */
    @Column({ type: DataType.JSONB, allowNull: false, defaultValue: [] })
    aliases: string[];

    /** Mã tỉnh mới khi đơn vị này bị gộp (giữ lại để quy đổi hồ sơ cũ) */
    @Column({ type: DataType.STRING(30), allowNull: true })
    mergedInto?: string;

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
    sortOrder: number;

    @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
    isActive: boolean;
}
