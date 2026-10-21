import { EntityDefinition } from "@common/constant/class/entity-definition";
import { IsYYYYMMDD } from "@common/decorator/validate.decorator";
import { BaseEntity } from "@common/interface/base-entity.interface";
import {
    IsDateString,
    IsEnum,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
} from "class-validator";
import { PeriodStatus } from "../common/constant";

export class Period implements BaseEntity {
    _id: string;

    @IsString()
    @MaxLength(7)
    @EntityDefinition.field({ label: "Mã kỳ", required: true })
    code: string;

    @IsInt()
    @EntityDefinition.field({ label: "Năm", required: true })
    year: number;

    @IsInt()
    @EntityDefinition.field({ label: "Tháng", required: true })
    month: number;

    @IsYYYYMMDD()
    @EntityDefinition.field({ label: "Ngày bắt đầu", required: true })
    startDate: string;

    @IsYYYYMMDD()
    @EntityDefinition.field({ label: "Ngày kết thúc", required: true })
    endDate: string;

    @IsEnum(PeriodStatus)
    @IsOptional()
    @EntityDefinition.field({
        label: "Trạng thái",
        enum: Object.values(PeriodStatus),
    })
    status?: PeriodStatus;

    @IsNumber()
    @IsOptional()
    @EntityDefinition.field({ label: "Đơn giá điểm" })
    pointRate?: number;

    @IsNumber()
    @IsOptional()
    @EntityDefinition.field({ label: "Phụ cấp cơ bản" })
    baseAllowance?: number;

    @IsYYYYMMDD()
    @IsOptional()
    @EntityDefinition.field({ label: "Ngày chi trả" })
    payoutDate?: string;

    @IsDateString()
    @IsOptional()
    @EntityDefinition.field({ label: "Thời điểm khóa" })
    lockedAt?: Date;

    @IsString()
    @MaxLength(24)
    @IsOptional()
    @EntityDefinition.field({ label: "Người khóa" })
    lockedBy?: string;
}
