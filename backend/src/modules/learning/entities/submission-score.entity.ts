import { EntityDefinition } from "@common/constant/class/entity-definition";
import { BaseEntity } from "@common/interface/base-entity.interface";
import { IsNumber, IsOptional, IsString, MaxLength } from "class-validator";

export class SubmissionScore implements BaseEntity {
    _id: string;

    @IsString()
    @MaxLength(24)
    @EntityDefinition.field({ label: "Bài nộp", required: true })
    submissionId: string;

    @IsString()
    @MaxLength(24)
    @EntityDefinition.field({ label: "Tiêu chí", required: true })
    criterionId: string;

    @IsNumber()
    @EntityDefinition.field({ label: "Điểm", required: true })
    score: number;

    @IsString()
    @IsOptional()
    @EntityDefinition.field({ label: "Nhận xét" })
    comment?: string;

    @IsString()
    @MaxLength(24)
    @IsOptional()
    @EntityDefinition.field({ label: "Người chấm" })
    scoredBy?: string;
}
