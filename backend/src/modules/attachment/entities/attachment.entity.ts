import { EntityDefinition } from "@common/constant/class/entity-definition";
import { BaseEntity } from "@common/interface/base-entity.interface";
import {
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
} from "class-validator";
import { AttachmentOwnerType } from "../common/constant";

export class Attachment implements BaseEntity {
    _id: string;

    @IsEnum(AttachmentOwnerType)
    @EntityDefinition.field({
        label: "Loại bản ghi",
        required: true,
        enum: Object.values(AttachmentOwnerType),
    })
    ownerType: AttachmentOwnerType;

    @IsString()
    @MaxLength(24)
    @EntityDefinition.field({ label: "Bản ghi", required: true })
    ownerId: string;

    @IsString()
    @MaxLength(50)
    @IsOptional()
    @EntityDefinition.field({ label: "Ô nhập" })
    fieldKey?: string;

    /** _id của file đã upload qua POST /file */
    @IsString()
    @MaxLength(24)
    @IsOptional()
    @EntityDefinition.field({ label: "File đã upload" })
    fileId?: string;

    @IsString()
    @EntityDefinition.field({ label: "URL", required: true })
    url: string;

    @IsString()
    @IsOptional()
    @EntityDefinition.field({ label: "Storage key" })
    storageKey?: string;

    @IsString()
    @MaxLength(255)
    @IsOptional()
    @EntityDefinition.field({ label: "Tên file" })
    fileName?: string;

    @IsString()
    @MaxLength(100)
    @IsOptional()
    @EntityDefinition.field({ label: "Mime type" })
    mimeType?: string;

    @IsInt()
    @IsOptional()
    @EntityDefinition.field({ label: "Dung lượng (byte)" })
    sizeBytes?: number;

    @IsInt()
    @IsOptional()
    @EntityDefinition.field({ label: "Thứ tự" })
    sortOrder?: number;

    @IsString()
    @MaxLength(24)
    @IsOptional()
    @EntityDefinition.field({ label: "Người tải lên" })
    uploadedBy?: string;
}
