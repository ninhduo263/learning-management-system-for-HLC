import { EntityDefinition } from "@common/constant/class/entity-definition";
import { BaseEntity } from "@common/interface/base-entity.interface";
import {
    IsBoolean,
    IsEnum,
    IsOptional,
    IsString,
    MaxLength,
} from "class-validator";
import { LibraryType } from "../common/constant";

export class LibraryItem implements BaseEntity {
    _id: string;

    @IsEnum(LibraryType)
    @EntityDefinition.field({
        label: "Loại thư viện",
        required: true,
        enum: Object.values(LibraryType),
    })
    libraryType: LibraryType;

    @IsString()
    @MaxLength(24)
    @IsOptional()
    @EntityDefinition.field({ label: "Ban" })
    departmentId?: string;

    @IsString()
    @MaxLength(500)
    @EntityDefinition.field({ label: "Tiêu đề", required: true })
    title: string;

    @IsString()
    @MaxLength(255)
    @IsOptional()
    @EntityDefinition.field({ label: "Tác giả" })
    author?: string;

    @IsString()
    @MaxLength(100)
    @IsOptional()
    @EntityDefinition.field({ label: "Thể loại" })
    category?: string;

    @IsString()
    @IsOptional()
    @EntityDefinition.field({ label: "Mô tả" })
    description?: string;

    @IsString()
    @IsOptional()
    @EntityDefinition.field({ label: "Ảnh bìa" })
    coverUrl?: string;

    @IsString()
    @IsOptional()
    @EntityDefinition.field({ label: "File" })
    fileUrl?: string;

    @IsString()
    @IsOptional()
    @EntityDefinition.field({ label: "Link ngoài" })
    externalUrl?: string;

    @IsBoolean()
    @IsOptional()
    @EntityDefinition.field({ label: "Đang hoạt động" })
    isActive?: boolean;

    @IsString()
    @MaxLength(24)
    @IsOptional()
    @EntityDefinition.field({ label: "Người tạo" })
    createdBy?: string;
}
