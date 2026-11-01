import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";

/** Thành viên thuộc nhóm (Department type GROUP); endDate = null là đang ở nhóm. Giữ lịch sử chuyển nhóm */
@Table({ tableName: Entity.GROUP_MEMBERSHIP })
export class GroupMembershipModel extends Model {
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    groupId: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    memberId: string;

    @Column({ type: DataType.DATEONLY, allowNull: false })
    startDate: string;

    @Column({ type: DataType.DATEONLY, allowNull: true })
    endDate?: string;

    @Column({ type: DataType.STRING(24), allowNull: true })
    changedBy?: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    note?: string;
}
