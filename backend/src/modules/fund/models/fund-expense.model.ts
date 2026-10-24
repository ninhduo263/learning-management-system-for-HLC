import { StrObjectId } from "@common/constant";
import { NumberColumn } from "@common/decorator/sql-column.decorator";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";

/** Khoản chi của quỹ (sổ thu chi chung) */
@Table({ tableName: Entity.FUND_EXPENSE })
export class FundExpenseModel extends Model {
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.DATEONLY, allowNull: false })
    expenseDate: string;

    @NumberColumn({ type: DataType.DECIMAL(14, 2), allowNull: false })
    amount: number;

    @Column({ type: DataType.STRING(255), allowNull: false })
    description: string;

    @Column({ type: DataType.STRING(100), allowNull: true })
    category?: string;

    @Column({ type: DataType.STRING(24), allowNull: true })
    createdBy?: string;

    /** MANUAL: Admin nhập; ALLOWANCE: chi phụ cấp sinh tự động khi Xác nhận đã chi */
    @Column({
        type: DataType.STRING(20),
        allowNull: false,
        defaultValue: "MANUAL",
    })
    source?: string;

    /** Kỳ phụ cấp gốc (mỗi kỳ chỉ 1 khoản chi) */
    @Column({ type: DataType.STRING(24), allowNull: true, unique: true })
    periodId?: string;

    /** Mã bảng tổng hợp, ví dụ PC-2026-10 */
    @Column({ type: DataType.STRING(20), allowNull: true })
    sheetCode?: string;

    /** Chi tiết: số người, các dòng bù chênh lệch (lý do, tháng gốc), các lần xác nhận lại */
    @Column({ type: DataType.JSONB, allowNull: true })
    detail?: Record<string, unknown>;
}
