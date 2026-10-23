import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";

/** Cấu hình theo loại nhóm: ngưỡng % thành viên hoàn thành để cộng điểm thưởng cho các chức vụ */
@Table({ tableName: Entity.GROUP_KIND_CONFIG })
export class GroupKindConfigModel extends Model {
    @StrObjectId()
    _id: string;

    /** MENTEE | FUND */
    @Column({ type: DataType.STRING(10), allowNull: false, unique: true })
    groupKind: string;

    /** Tỷ lệ % (0–100). Thưởng khi tỷ lệ hoàn thành VƯỢT ngưỡng này */
    @Column({
        type: DataType.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 90,
    })
    completionThreshold: number;
}
