import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Column, DataType, Index, Model, Table } from "sequelize-typescript";

/**
 * Nhật ký nộp / sửa recap (vòng 10): mỗi lần nộp, sửa, nộp lại, nộp hộ ghi một dòng với thời điểm, nội dung trước và
 * sau. Người duyệt xem để phát hiện trường hợp nộp sơ sài giữ mốc thưởng sớm rồi sửa lại. Chỉ ghi thêm.
 */
@Table({ tableName: Entity.MENTORING_RECAP_LOG, updatedAt: false })
export class MentoringRecapLogModel extends Model {
    @StrObjectId()
    _id: string;

    @Index
    @Column({ type: DataType.STRING(24), allowNull: false })
    recapId: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    sessionId: string;

    /** SUBMIT (nộp lần đầu) | EDIT (sửa khi chưa duyệt) | RESUBMIT (nộp lại sau khi bị trả) | PROXY (nộp hộ) */
    @Column({ type: DataType.STRING(10), allowNull: false })
    action: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    contentBefore?: string;

    @Column({ type: DataType.TEXT, allowNull: false })
    contentAfter: string;

    /** Ảnh / tệp đính kèm trước và sau: [{ fileId, fileName }] */
    @Column({ type: DataType.JSONB, allowNull: true })
    filesBefore?: Record<string, unknown>[];

    @Column({ type: DataType.JSONB, allowNull: true })
    filesAfter?: Record<string, unknown>[];

    /** Thời điểm nộp / sửa (nộp hộ: thời điểm nộp khai báo) */
    @Column({ type: DataType.DATE, allowNull: false })
    at: Date;

    @Column({ type: DataType.STRING(24), allowNull: true })
    actorUserId?: string;
}
