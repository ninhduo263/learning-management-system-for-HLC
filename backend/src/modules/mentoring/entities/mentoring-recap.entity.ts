import { EntityDefinition } from "@common/constant/class/entity-definition";
import { BaseEntity } from "@common/interface/base-entity.interface";
import {
    IsBoolean,
    IsDateString,
    IsEnum,
    IsOptional,
    IsString,
    MaxLength,
} from "class-validator";
import { MentoringRole, RecapReviewStatus } from "../common/constant";

export class MentoringRecap implements BaseEntity {
    _id: string;

    @IsString()
    @MaxLength(24)
    @EntityDefinition.field({ label: "Buổi mentoring", required: true })
    sessionId: string;

    @IsString()
    @MaxLength(24)
    @EntityDefinition.field({ label: "Người viết", required: true })
    memberId: string;

    @IsEnum(MentoringRole)
    @EntityDefinition.field({
        label: "Vai trò",
        required: true,
        enum: Object.values(MentoringRole),
    })
    role: MentoringRole;

    @IsString()
    @EntityDefinition.field({ label: "Nội dung", required: true })
    content: string;

    @IsDateString()
    @EntityDefinition.field({ label: "Nộp lần đầu", required: true })
    firstSubmittedAt: Date;

    @IsDateString()
    @EntityDefinition.field({ label: "Nộp gần nhất", required: true })
    lastSubmittedAt: Date;

    @IsBoolean()
    @EntityDefinition.field({ label: "Nộp muộn", required: true })
    isLate: boolean;

    @IsEnum(RecapReviewStatus)
    @IsOptional()
    @EntityDefinition.field({
        label: "Trạng thái duyệt",
        enum: Object.values(RecapReviewStatus),
    })
    reviewStatus?: RecapReviewStatus;

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

    score?: number;

    scoreDetails?: Record<string, unknown>[];

    scoreFeedback?: string;

    scoredBy?: string;

    scoredAt?: Date;
}
