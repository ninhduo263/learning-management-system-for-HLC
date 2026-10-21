import { EntityDefinition } from "@common/constant/class/entity-definition";
import { BaseEntity } from "@common/interface/base-entity.interface";
import {
    IsDateString,
    IsInt,
    IsObject,
    IsOptional,
    IsString,
    MaxLength,
} from "class-validator";

export class MentoringAward implements BaseEntity {
    _id: string;

    @IsString()
    @MaxLength(24)
    @EntityDefinition.field({ label: "Kỳ tháng", required: true })
    periodId: string;

    @IsString()
    @MaxLength(24)
    @EntityDefinition.field({ label: "Buổi mentoring", required: true })
    sessionId: string;

    @IsInt()
    @EntityDefinition.field({ label: "Hạng", required: true })
    rank: number;

    @IsObject()
    @IsOptional()
    @EntityDefinition.field({ label: "Căn cứ xếp hạng" })
    rankingBasis?: Record<string, unknown>;

    @IsString()
    @MaxLength(24)
    @IsOptional()
    @EntityDefinition.field({ label: "Người chốt" })
    decidedBy?: string;

    @IsDateString()
    @IsOptional()
    @EntityDefinition.field({ label: "Thời điểm chốt" })
    decidedAt?: Date;
}
