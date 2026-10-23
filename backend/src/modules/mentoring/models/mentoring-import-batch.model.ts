import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";

/** 1 lần nhập dữ liệu mentoring quý cũ; lưu các bản ghi đã tạo để hoàn tác cả lô */
@Table({ tableName: Entity.MENTORING_IMPORT_BATCH })
export class MentoringImportBatchModel extends Model {
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(10), allowNull: false })
    quarterCode: string;

    @Column({ type: DataType.STRING(255), allowNull: true })
    fileName?: string;

    /** ACTIVE | REVERTED */
    @Column({
        type: DataType.STRING(10),
        allowNull: false,
        defaultValue: "ACTIVE",
    })
    status: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    reason?: string;

    /** { pairIds, sessionIds (đặt lịch), recapIds, rows } */
    @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {} })
    created: {
        pairIds?: string[];
        sessionIds?: string[];
        recapIds?: string[];
        rows?: number;
    };

    @Column({ type: DataType.STRING(24), allowNull: true })
    createdBy?: string;

    @Column({ type: DataType.STRING(24), allowNull: true })
    revertedBy?: string;

    @Column({ type: DataType.DATE, allowNull: true })
    revertedAt?: Date;
}
