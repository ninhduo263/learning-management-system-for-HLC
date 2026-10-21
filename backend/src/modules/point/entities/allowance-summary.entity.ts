import { EntityDefinition } from "@common/constant/class/entity-definition";
import { BaseEntity } from "@common/interface/base-entity.interface";
import {
    IsDateString,
    IsEnum,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    MaxLength,
} from "class-validator";
import { AllowanceSummaryStatus } from "../common/constant";

export class AllowanceSummary implements BaseEntity {
    _id: string;

    @IsString()
    @MaxLength(24)
    @EntityDefinition.field({ label: "Kỳ tháng", required: true })
    periodId: string;

    @IsString()
    @MaxLength(24)
    @EntityDefinition.field({ label: "Thành viên", required: true })
    memberId: string;

    @IsObject()
    @IsOptional()
    @EntityDefinition.field({ label: "Điểm theo loại" })
    pointsByType?: Record<string, unknown>;

    @IsNumber()
    @IsOptional()
    @EntityDefinition.field({ label: "Tổng điểm" })
    totalPoints?: number;

    @IsNumber()
    @IsOptional()
    @EntityDefinition.field({ label: "Đơn giá điểm" })
    pointRate?: number;

    @IsNumber()
    @IsOptional()
    @EntityDefinition.field({ label: "Phụ cấp cơ bản" })
    baseAllowance?: number;

    @IsNumber()
    @IsOptional()
    @EntityDefinition.field({ label: "Thành tiền" })
    amount?: number;

    @IsEnum(AllowanceSummaryStatus)
    @IsOptional()
    @EntityDefinition.field({
        label: "Trạng thái",
        enum: Object.values(AllowanceSummaryStatus),
    })
    status?: AllowanceSummaryStatus;

    @IsString()
    @MaxLength(255)
    @IsOptional()
    @EntityDefinition.field({ label: "Họ tên (lúc chốt)" })
    fullNameSnapshot?: string;

    @IsString()
    @MaxLength(50)
    @IsOptional()
    @EntityDefinition.field({ label: "Số tài khoản (lúc chốt)" })
    bankAccountSnapshot?: string;

    @IsString()
    @MaxLength(255)
    @IsOptional()
    @EntityDefinition.field({ label: "Ngân hàng (lúc chốt)" })
    bankNameSnapshot?: string;

    @IsDateString()
    @EntityDefinition.field({ label: "Thời điểm tính", required: true })
    calculatedAt: Date;

    @IsDateString()
    @IsOptional()
    @EntityDefinition.field({ label: "Thời điểm chốt" })
    lockedAt?: Date;

    @IsDateString()
    @IsOptional()
    @EntityDefinition.field({ label: "Thời điểm chi trả" })
    paidAt?: Date;
}
