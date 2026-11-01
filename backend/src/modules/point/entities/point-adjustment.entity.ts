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
import { PointAdjustmentKind, PointAdjustmentStatus } from "../common/constant";

export class PointAdjustment implements BaseEntity {
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

    @IsEnum(PointAdjustmentKind)
    @EntityDefinition.field({
        label: "Loại điều chỉnh",
        required: true,
        enum: Object.values(PointAdjustmentKind),
    })
    kind: PointAdjustmentKind;

    @IsNumber()
    @EntityDefinition.field({ label: "Số điểm", required: true })
    points: number;

    @IsString()
    @EntityDefinition.field({ label: "Lý do", required: true })
    reason: string;

    @IsString()
    @MaxLength(24)
    @IsOptional()
    @EntityDefinition.field({ label: "Dòng điểm liên quan" })
    relatedEntryId?: string;

    @IsEnum(PointAdjustmentStatus)
    @IsOptional()
    @EntityDefinition.field({
        label: "Trạng thái",
        enum: Object.values(PointAdjustmentStatus),
    })
    status?: PointAdjustmentStatus;

    @IsString()
    @MaxLength(24)
    @IsOptional()
    @EntityDefinition.field({ label: "Người đề nghị" })
    requestedBy?: string;

    @IsString()
    @MaxLength(24)
    @IsOptional()
    @EntityDefinition.field({ label: "Người duyệt" })
    reviewedBy?: string;

    @IsDateString()
    @IsOptional()
    @EntityDefinition.field({ label: "Thời điểm duyệt" })
    reviewedAt?: Date;

    @IsString()
    @IsOptional()
    @EntityDefinition.field({ label: "Ghi chú duyệt" })
    reviewNote?: string;

    amount?: number;

    sourcePeriodId?: string;
}
