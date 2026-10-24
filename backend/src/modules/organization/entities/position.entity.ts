import { EntityDefinition } from "@common/constant/class/entity-definition";
import { BaseEntity } from "@common/interface/base-entity.interface";
import {
    IsArray,
    IsBoolean,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
} from "class-validator";

export class Position implements BaseEntity {
    _id: string;

    @IsString()
    @MaxLength(50)
    @EntityDefinition.field({ label: "Mã chức vụ", required: true })
    code: string;

    @IsString()
    @MaxLength(255)
    @EntityDefinition.field({ label: "Tên chức vụ", required: true })
    name: string;

    @IsInt()
    @IsOptional()
    @EntityDefinition.field({ label: "Thứ tự" })
    sortOrder?: number;

    @IsBoolean()
    @IsOptional()
    @EntityDefinition.field({ label: "Đang hoạt động" })
    isActive?: boolean;

    @IsString()
    @IsOptional()
    @EntityDefinition.field({ label: "Loại nhóm áp dụng" })
    groupKind?: string;

    @IsArray()
    @IsOptional()
    @EntityDefinition.field({ label: "Quyền hạn" })
    permissions?: string[];

    @IsNumber()
    @IsOptional()
    @EntityDefinition.field({ label: "Điểm phụ cấp" })
    allowancePoints?: number;

    @IsNumber()
    @IsOptional()
    @EntityDefinition.field({ label: "Điểm thưởng" })
    bonusPoints?: number;

    @IsString()
    @IsOptional()
    @EntityDefinition.field({ label: "Quyền quản trị" })
    adminScope?: string;

    @IsString()
    @IsOptional()
    @EntityDefinition.field({ label: "Mô tả" })
    description?: string;

    @IsArray()
    @IsOptional()
    @EntityDefinition.field({ label: "Phạm vi loại nhóm" })
    scopeKinds?: string[];
}
