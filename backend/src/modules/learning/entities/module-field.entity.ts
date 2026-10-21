import { EntityDefinition } from "@common/constant/class/entity-definition";
import { BaseEntity } from "@common/interface/base-entity.interface";
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsInt,
    IsObject,
    IsOptional,
    IsString,
    MaxLength,
} from "class-validator";
import { ModuleFieldType } from "../common/constant";

export class ModuleField implements BaseEntity {
    _id: string;

    @IsString()
    @MaxLength(24)
    @EntityDefinition.field({ label: "Module", required: true })
    moduleId: string;

    @IsString()
    @MaxLength(50)
    @EntityDefinition.field({ label: "Key", required: true })
    key: string;

    @IsString()
    @MaxLength(255)
    @EntityDefinition.field({ label: "Nhãn", required: true })
    label: string;

    @IsEnum(ModuleFieldType)
    @EntityDefinition.field({
        label: "Kiểu ô",
        required: true,
        enum: Object.values(ModuleFieldType),
    })
    fieldType: ModuleFieldType;

    @IsBoolean()
    @IsOptional()
    @EntityDefinition.field({ label: "Bắt buộc" })
    isRequired?: boolean;

    @IsBoolean()
    @IsOptional()
    @EntityDefinition.field({ label: "Chặn trùng" })
    isUnique?: boolean;

    @IsArray()
    @IsOptional()
    @EntityDefinition.field({ label: "Lựa chọn" })
    options?: unknown[];

    @IsObject()
    @IsOptional()
    @EntityDefinition.field({ label: "Ràng buộc" })
    validation?: Record<string, unknown>;

    @IsInt()
    @IsOptional()
    @EntityDefinition.field({ label: "Thứ tự" })
    sortOrder?: number;

    @IsBoolean()
    @IsOptional()
    @EntityDefinition.field({ label: "Đang hoạt động" })
    isActive?: boolean;
}
