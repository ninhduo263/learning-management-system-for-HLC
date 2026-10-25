import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";

/** Người được Admin toàn cục ủy quyền duyệt thay đổi hồ sơ nhạy cảm: phạm vi (MTE / MTO / tất cả) và thời hạn */
@Table({ tableName: Entity.PROFILE_APPROVER })
export class ProfileApproverModel extends Model {
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    memberId: string;

    /** ALL | MENTEE | MENTOR */
    @Column({
        type: DataType.STRING(10),
        allowNull: false,
        defaultValue: "ALL",
    })
    scope: string;

    @Column({ type: DataType.DATEONLY, allowNull: false })
    startDate: string;

    @Column({ type: DataType.DATEONLY, allowNull: false })
    endDate: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    note?: string;

    @Column({ type: DataType.STRING(24), allowNull: true })
    createdBy?: string;

    @Column({ type: DataType.DATE, allowNull: true })
    revokedAt?: Date;
}
