import { EntityDefinition } from "@common/constant/class/entity-definition";
import { IsYYYYMMDD } from "@common/decorator/validate.decorator";
import { BaseEntity } from "@common/interface/base-entity.interface";
import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    MaxLength,
} from "class-validator";
import { PointRuleKind, PointSourceType } from "../common/constant";
import { TargetMemberType } from "@module/member/common/constant";

export class PointRule implements BaseEntity {
    _id: string;

    @IsString()
    @MaxLength(50)
    @EntityDefinition.field({ label: "Mã rule", required: true })
    code: string;

    @IsString()
    @MaxLength(255)
    @EntityDefinition.field({ label: "Tên rule", required: true })
    name: string;

    @IsString()
    @MaxLength(24)
    @EntityDefinition.field({ label: "Loại điểm", required: true })
    pointTypeId: string;

    @IsEnum(PointRuleKind)
    @EntityDefinition.field({
        label: "Kiểu rule",
        required: true,
        enum: Object.values(PointRuleKind),
    })
    ruleKind: PointRuleKind;

    @IsEnum(PointSourceType)
    @EntityDefinition.field({
        label: "Nguồn dữ liệu",
        required: true,
        enum: Object.values(PointSourceType),
    })
    sourceType: PointSourceType;

    @IsEnum(TargetMemberType)
    @IsOptional()
    @EntityDefinition.field({
        label: "Đối tượng",
        enum: Object.values(TargetMemberType),
    })
    targetMemberType?: TargetMemberType;

    @IsObject()
    @IsOptional()
    @EntityDefinition.field({ label: "Điều kiện" })
    conditions?: Record<string, unknown>;

    @IsNumber()
    @EntityDefinition.field({ label: "Số điểm", required: true })
    points: number;

    @IsString()
    @MaxLength(50)
    @IsOptional()
    @EntityDefinition.field({ label: "Nhóm loại trừ" })
    exclusiveGroup?: string;

    @IsInt()
    @IsOptional()
    @EntityDefinition.field({ label: "Ưu tiên" })
    priority?: number;

    @IsNumber()
    @IsOptional()
    @EntityDefinition.field({ label: "Tối đa / kỳ" })
    maxPointsPerPeriod?: number;

    @IsYYYYMMDD()
    @IsOptional()
    @EntityDefinition.field({ label: "Hiệu lực từ" })
    effectiveFrom?: string;

    @IsYYYYMMDD()
    @IsOptional()
    @EntityDefinition.field({ label: "Hiệu lực đến" })
    effectiveTo?: string;

    @IsBoolean()
    @IsOptional()
    @EntityDefinition.field({ label: "Đang hoạt động" })
    isActive?: boolean;
}
