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
}
