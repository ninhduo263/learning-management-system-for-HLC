import { EntityDefinition } from "@common/constant/class/entity-definition";
import { BaseEntity } from "@common/interface/base-entity.interface";
import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
} from "class-validator";
import { PointCategory } from "../common/constant";

export class PointType implements BaseEntity {
    _id: string;

    @IsString()
    @MaxLength(50)
    @EntityDefinition.field({ label: "Mã loại điểm", required: true })
    code: string;

    @IsString()
    @MaxLength(255)
    @EntityDefinition.field({ label: "Tên loại điểm", required: true })
    name: string;

    @IsEnum(PointCategory)
    @EntityDefinition.field({
        label: "Nhóm",
        required: true,
        enum: Object.values(PointCategory),
    })
    category: PointCategory;

    @IsString()
    @IsOptional()
    @EntityDefinition.field({ label: "Mô tả" })
    description?: string;

    @IsBoolean()
    @IsOptional()
    @EntityDefinition.field({ label: "Quy đổi ra tiền" })
    isAllowance?: boolean;

    @IsInt()
    @IsOptional()
    @EntityDefinition.field({ label: "Thứ tự" })
    sortOrder?: number;

    @IsBoolean()
    @IsOptional()
    @EntityDefinition.field({ label: "Đang hoạt động" })
    isActive?: boolean;
}
