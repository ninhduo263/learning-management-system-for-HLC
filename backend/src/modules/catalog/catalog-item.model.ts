import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";

/**
 * Danh mục dùng chung (CAREER: 38 nhóm ngành nghề; BANK: ngân hàng nhận chuyển khoản chi trả từ MB Bank).
 * Hồ sơ lưu `code` (không đổi) nên đổi tên / ẩn / gộp mục không làm hỏng dữ liệu đã lưu.
 */
@Table({
    tableName: Entity.CATALOG_ITEM,
    indexes: [{ unique: true, fields: ["type", "code"] }],
})
export class CatalogItemModel extends Model {
    @StrObjectId()
    _id: string;

    /** CAREER | BANK */
    @Column({ type: DataType.STRING(20), allowNull: false })
    type: string;

    @Column({ type: DataType.STRING(30), allowNull: false })
    code: string;

    @Column({ type: DataType.STRING(255), allowNull: false })
    name: string;

    /** Tên viết tắt (ngân hàng) */
    @Column({ type: DataType.STRING(100), allowNull: true })
    shortName?: string;

    /** Tên cũ / cách viết khác để quy đổi dữ liệu nhập tự do */
    @Column({ type: DataType.JSONB, allowNull: false, defaultValue: [] })
    aliases: string[];

    /** Mã mục mới khi mục này bị gộp (ngân hàng sáp nhập) */
    @Column({ type: DataType.STRING(30), allowNull: true })
    mergedInto?: string;

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
    sortOrder: number;

    @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
    isActive: boolean;
}
