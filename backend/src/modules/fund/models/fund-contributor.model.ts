import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";

/** Thầy cô / người đóng quỹ không có hồ sơ MTO */
@Table({ tableName: Entity.FUND_CONTRIBUTOR })
export class FundContributorModel extends Model {
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(255), allowNull: false })
    fullName: string;

    @Column({ type: DataType.STRING(255), allowNull: true })
    organization?: string;

    @Column({ type: DataType.STRING(100), allowNull: true })
    contact?: string;

    /** Nhóm HLC Fund phụ trách (Leader nhóm được nộp hộ, duyệt) */
    @Column({ type: DataType.STRING(24), allowNull: true })
    groupId?: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    note?: string;

    @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
    isActive?: boolean;

    @Column({ type: DataType.STRING(24), allowNull: true })
    createdBy?: string;
}
