import { NumberColumn } from "@common/decorator/sql-column.decorator";
import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";
import { Position } from "../entities/position.entity";

@Table({ tableName: Entity.POSITION })
export class PositionModel extends Model implements Position {
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(50), allowNull: false, unique: true })
    code: string;

    @Column({ type: DataType.STRING(255), allowNull: false })
    name: string;

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
    sortOrder?: number;

    @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
    isActive?: boolean;

    /** Vai trò dùng cho loại nhóm nào: MENTEE | FUND; null = chức vụ của ban (không gắn nhóm) */
    @Column({ type: DataType.STRING(10), allowNull: true })
    groupKind?: string;

    /** Quyền hạn: VIEW_PROGRESS, SCORE_RECAP, REVIEW_FUND, PROXY_FUND */
    @Column({ type: DataType.JSONB, allowNull: true })
    permissions?: string[];

    /** Điểm phụ cấp mặc định mỗi tháng cho người giữ vai trò */
    @NumberColumn({
        type: DataType.DECIMAL(6, 2),
        allowNull: false,
        defaultValue: 0,
    })
    allowancePoints?: number;

    /** Điểm thưởng khi tỷ lệ thành viên nhóm hoàn thành vượt ngưỡng của loại nhóm */
    @NumberColumn({
        type: DataType.DECIMAL(6, 2),
        allowNull: false,
        defaultValue: 0,
    })
    bonusPoints?: number;

    /** Vai trò quản trị toàn hệ thống (FUND | MENTORING | POINT): giữ vai trò = có quyền admin tương ứng */
    @Column({ type: DataType.STRING(20), allowNull: true })
    adminScope?: string;

    /** Chức vụ Admin module học tập nhỏ: module được quản lý (adminScope = LEARNING_MODULE) */
    @Column({ type: DataType.STRING(24), allowNull: true })
    moduleId?: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    description?: string;

    /** Vai trò cấp ban: quyền theo nhóm áp dụng cho MỌI nhóm của các loại này (MENTEE, FUND) */
    @Column({ type: DataType.JSONB, allowNull: true })
    scopeKinds?: string[];
}
