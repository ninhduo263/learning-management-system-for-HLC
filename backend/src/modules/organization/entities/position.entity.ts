import { EntityDefinition } from "@common/constant/class/entity-definition";
import { BaseEntity } from "@common/interface/base-entity.interface";
import {
    IsBoolean,
    IsInt,
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
}
