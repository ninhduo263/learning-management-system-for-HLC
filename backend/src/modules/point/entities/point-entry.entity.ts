import { EntityDefinition } from "@common/constant/class/entity-definition";
import { BaseEntity } from "@common/interface/base-entity.interface";
import {
    IsDateString,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
} from "class-validator";
import { PointEntryStatus, PointSourceType } from "../common/constant";

export class PointEntry implements BaseEntity {
    _id: string;

    @IsString()
    @MaxLength(24)
    @EntityDefinition.field({ label: "Kỳ tháng", required: true })
    periodId: string;

    @IsString()
    @MaxLength(24)
    @EntityDefinition.field({ label: "Thành viên", required: true })
    memberId: string;

    @IsString()
    @MaxLength(24)
    @EntityDefinition.field({ label: "Loại điểm", required: true })
    pointTypeId: string;

    @IsString()
    @MaxLength(24)
    @IsOptional()
    @EntityDefinition.field({ label: "Rule" })
    ruleId?: string;

    @IsNumber()
    @EntityDefinition.field({ label: "Số điểm", required: true })
    points: number;

    @IsEnum(PointSourceType)
    @EntityDefinition.field({
        label: "Nguồn dữ liệu",
        required: true,
        enum: Object.values(PointSourceType),
    })
    sourceType: PointSourceType;

    @IsString()
    @MaxLength(24)
    @EntityDefinition.field({ label: "Bản ghi gốc", required: true })
    sourceId: string;

    @IsString()
    @IsOptional()
    @EntityDefinition.field({ label: "Diễn giải" })
    description?: string;

    @IsEnum(PointEntryStatus)
    @IsOptional()
    @EntityDefinition.field({
        label: "Trạng thái",
        enum: Object.values(PointEntryStatus),
    })
    status?: PointEntryStatus;

    @IsString()
    @IsOptional()
    @EntityDefinition.field({ label: "Lý do hủy" })
    voidReason?: string;

    @IsString()
    @MaxLength(24)
    @IsOptional()
    @EntityDefinition.field({ label: "Người hủy" })
    voidedBy?: string;

    @IsDateString()
    @IsOptional()
    @EntityDefinition.field({ label: "Thời điểm hủy" })
    voidedAt?: Date;

    @IsString()
    @MaxLength(24)
    @IsOptional()
    @EntityDefinition.field({ label: "Người tạo" })
    createdBy?: string;
}
