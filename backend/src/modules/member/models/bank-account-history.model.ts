import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";

/**
 * Lịch sử thông tin ngân hàng theo kỳ áp dụng: kỳ nào dùng tài khoản nào (bảng phụ cấp lấy theo kỳ, kể cả khi
 * mở khóa kỳ cũ). Bản ghi effectivePeriodCode = "0000-00" là thông tin trước lần đổi đầu tiên.
 */
@Table({ tableName: Entity.BANK_ACCOUNT_HISTORY, updatedAt: false })
export class BankAccountHistoryModel extends Model {
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    memberId: string;

    @Column({ type: DataType.STRING(50), allowNull: true })
    bankAccount?: string;

    @Column({ type: DataType.STRING(30), allowNull: true })
    bankCode?: string;

    @Column({ type: DataType.STRING(255), allowNull: true })
    bankName?: string;

    @Column({ type: DataType.STRING(7), allowNull: false })
    effectivePeriodCode: string;

    /** BASELINE | APPROVAL | ADMIN */
    @Column({ type: DataType.STRING(10), allowNull: false })
    source: string;

    @Column({ type: DataType.STRING(24), allowNull: true })
    requestId?: string;

    @Column({ type: DataType.STRING(24), allowNull: true })
    createdBy?: string;
}
