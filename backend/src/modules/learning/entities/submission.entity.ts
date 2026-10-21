import { EntityDefinition } from "@common/constant/class/entity-definition";
import { BaseEntity } from "@common/interface/base-entity.interface";
import {
    IsBoolean,
    IsDateString,
    IsEnum,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from "class-validator";
import { SubmissionReviewStatus, SubmissionStatus } from "../common/constant";

export class Submission implements BaseEntity {
    _id: string;

    @IsString()
    @MaxLength(24)
    @EntityDefinition.field({ label: "Module", required: true })
    moduleId: string;

    @IsString()
    @MaxLength(24)
    @IsOptional()
    @EntityDefinition.field({ label: "Bài tập" })
    assignmentId?: string;

    @IsString()
    @MaxLength(24)
    @EntityDefinition.field({ label: "Thành viên", required: true })
    memberId: string;

    @IsString()
    @MaxLength(24)
    @EntityDefinition.field({ label: "Kỳ tháng", required: true })
    periodId: string;

    @IsString()
    @MaxLength(20)
    @EntityDefinition.field({ label: "Chu kỳ", required: true })
    cycleKey: string;

    @IsString()
    @MaxLength(24)
    @IsOptional()
    @EntityDefinition.field({ label: "Sách / tài liệu" })
    libraryItemId?: string;

    @IsObject()
    @IsOptional()
    @EntityDefinition.field({ label: "Nội dung form" })
    data?: Record<string, unknown>;

    @IsEnum(SubmissionStatus)
    @IsOptional()
    @EntityDefinition.field({
        label: "Trạng thái",
        enum: Object.values(SubmissionStatus),
    })
    status?: SubmissionStatus;

    @IsDateString()
    @IsOptional()
    @EntityDefinition.field({ label: "Thời điểm nộp" })
    submittedAt?: Date;

    @IsBoolean()
    @IsOptional()
    @EntityDefinition.field({ label: "Nộp muộn" })
    isLate?: boolean;

    @IsEnum(SubmissionReviewStatus)
    @IsOptional()
    @EntityDefinition.field({
        label: "Trạng thái duyệt",
        enum: Object.values(SubmissionReviewStatus),
    })
    reviewStatus?: SubmissionReviewStatus;

    @IsString()
    @MaxLength(24)
    @IsOptional()
    @EntityDefinition.field({ label: "Người duyệt" })
    reviewerId?: string;

    @IsDateString()
    @IsOptional()
    @EntityDefinition.field({ label: "Thời điểm duyệt" })
    reviewedAt?: Date;

    @IsString()
    @IsOptional()
    @EntityDefinition.field({ label: "Nhận xét" })
    feedback?: string;

    /** Điểm chấm bài theo thang của module, KHÔNG phải điểm phụ cấp */
    @Min(0)
    @IsNumber()
    @IsOptional()
    @EntityDefinition.field({ label: "Điểm chấm bài" })
    totalScore?: number;
}
