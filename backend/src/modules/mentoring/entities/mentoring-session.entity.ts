import { EntityDefinition } from "@common/constant/class/entity-definition";
import { BaseEntity } from "@common/interface/base-entity.interface";
import {
    IsDateString,
    IsEnum,
    IsInt,
    IsObject,
    IsOptional,
    IsString,
    MaxLength,
} from "class-validator";
import { MentoringSessionStatus } from "../common/constant";

export class MentoringSession implements BaseEntity {
    _id: string;

    @IsString()
    @MaxLength(24)
    @EntityDefinition.field({ label: "Cặp mentoring", required: true })
    pairId: string;

    @IsString()
    @MaxLength(24)
    @EntityDefinition.field({ label: "Kỳ tháng", required: true })
    periodId: string;

    @IsInt()
    @EntityDefinition.field({ label: "Tháng trong quý", required: true })
    monthIndex: number;

    @IsString()
    @MaxLength(64)
    @EntityDefinition.field({ label: "Mã mentoring tháng", required: true })
    code: string;

    @IsEnum(MentoringSessionStatus)
    @IsOptional()
    @EntityDefinition.field({
        label: "Trạng thái",
        enum: Object.values(MentoringSessionStatus),
    })
    status?: MentoringSessionStatus;

    @IsDateString()
    @IsOptional()
    @EntityDefinition.field({ label: "Bắt đầu" })
    scheduledStartAt?: Date;

    @IsDateString()
    @IsOptional()
    @EntityDefinition.field({ label: "Kết thúc" })
    scheduledEndAt?: Date;

    @IsDateString()
    @IsOptional()
    @EntityDefinition.field({ label: "Mốc chốt lịch lần đầu" })
    firstScheduledStartAt?: Date;

    @IsString()
    @MaxLength(255)
    @IsOptional()
    @EntityDefinition.field({ label: "Địa điểm" })
    location?: string;

    @IsString()
    @IsOptional()
    @EntityDefinition.field({ label: "Link họp" })
    meetingLink?: string;

    @IsString()
    @IsOptional()
    @EntityDefinition.field({ label: "Ghi chú lịch" })
    scheduleNote?: string;

    @IsString()
    @MaxLength(24)
    @IsOptional()
    @EntityDefinition.field({ label: "Người gửi lịch" })
    scheduleSubmittedBy?: string;

    @IsDateString()
    @IsOptional()
    @EntityDefinition.field({ label: "Thời điểm gửi lịch" })
    scheduleSubmittedAt?: Date;

    @IsDateString()
    @IsOptional()
    @EntityDefinition.field({ label: "Hạn nộp recap" })
    recapDeadlineAt?: Date;

    @IsObject()
    @IsOptional()
    @EntityDefinition.field({ label: "Trạng thái import" })
    importedStatus?: Record<string, unknown>;
}
