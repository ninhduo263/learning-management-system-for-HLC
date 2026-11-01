import { EntityDefinition } from "@common/constant/class/entity-definition";
import { BaseEntity } from "@common/interface/base-entity.interface";
import {
    IsBoolean,
    IsEnum,
    IsOptional,
    IsString,
    MaxLength,
} from "class-validator";
import { DepartmentType, GroupKind } from "../common/constant";

export class Department implements BaseEntity {
    _id: string;

    @IsString()
    @MaxLength(50)
    @EntityDefinition.field({ label: "Mã ban", required: true })
    code: string;

    @IsString()
    @MaxLength(255)
    @EntityDefinition.field({ label: "Tên ban", required: true })
    name: string;

    @IsEnum(DepartmentType)
    @IsOptional()
    @EntityDefinition.field({
        label: "Loại",
        enum: Object.values(DepartmentType),
    })
    type?: DepartmentType;

    @IsString()
    @MaxLength(24)
    @IsOptional()
    @EntityDefinition.field({ label: "Ban cha" })
    parentId?: string;

    @IsBoolean()
    @IsOptional()
    @EntityDefinition.field({ label: "Đang hoạt động" })
    isActive?: boolean;

    @IsBoolean()
    @IsOptional()
    @EntityDefinition.field({ label: "Phó nhóm được chấm/duyệt" })
    deputyCanReview?: boolean;

    @IsEnum(GroupKind)
    @IsOptional()
    @EntityDefinition.field({
        label: "Loại nhóm",
        enum: Object.values(GroupKind),
    })
    groupKind?: GroupKind;
}
