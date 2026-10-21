import { EntityDefinition } from "@common/constant/class/entity-definition";
import { BaseEntity } from "@common/interface/base-entity.interface";
import {
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
} from "class-validator";

export class ModuleCriterion implements BaseEntity {
    _id: string;

    @IsString()
    @MaxLength(24)
    @EntityDefinition.field({ label: "Module", required: true })
    moduleId: string;

    @IsString()
    @MaxLength(255)
    @EntityDefinition.field({ label: "Tiêu chí", required: true })
    name: string;

    @IsString()
    @IsOptional()
    @EntityDefinition.field({ label: "Mô tả" })
    description?: string;

    @IsNumber()
    @EntityDefinition.field({ label: "Điểm tối đa", required: true })
    maxScore: number;

    @IsNumber()
    @IsOptional()
    @EntityDefinition.field({ label: "Trọng số" })
    weight?: number;

    @IsInt()
    @IsOptional()
    @EntityDefinition.field({ label: "Thứ tự" })
    sortOrder?: number;
}
