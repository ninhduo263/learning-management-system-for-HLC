import { StrObjectId } from "@common/constant";
import { NumberColumn } from "@common/decorator/sql-column.decorator";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";
import { AttachmentOwnerType } from "../common/constant";
import { Attachment } from "../entities/attachment.entity";

@Table({ tableName: Entity.ATTACHMENT })
export class AttachmentModel extends Model implements Attachment {
    @StrObjectId()
    _id: string;

    @Column({
        type: DataType.STRING,
        validate: { isIn: [Object.values(AttachmentOwnerType)] },
        allowNull: false,
    })
    ownerType: AttachmentOwnerType;

    @Column({ type: DataType.STRING(24), allowNull: false })
    ownerId: string;

    @Column({ type: DataType.STRING(50), allowNull: true })
    fieldKey?: string;

    @Column({ type: DataType.STRING(24), allowNull: true })
    fileId?: string;

    @Column({ type: DataType.TEXT, allowNull: false })
    url: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    storageKey?: string;

    @Column({ type: DataType.STRING(255), allowNull: true })
    fileName?: string;

    @Column({ type: DataType.STRING(100), allowNull: true })
    mimeType?: string;

    @NumberColumn({ type: DataType.BIGINT, allowNull: true })
    sizeBytes?: number;

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
    sortOrder?: number;

    @Column({ type: DataType.STRING(24), allowNull: true })
    uploadedBy?: string;
}
