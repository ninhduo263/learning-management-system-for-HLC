import { EntityDefinition } from "@common/constant/class/entity-definition";
import { BaseEntity } from "@common/interface/base-entity.interface";
import {
    IsBoolean,
    IsDateString,
    IsOptional,
    IsString,
    MaxLength,
} from "class-validator";

export class MentorPreference implements BaseEntity {
    _id: string;

    @IsString()
    @MaxLength(24)
    @EntityDefinition.field({ label: "Quý", required: true })
    quarterId: string;

    @IsString()
    @MaxLength(24)
    @EntityDefinition.field({ label: "Mentee", required: true })
    menteeId: string;

    @IsString()
    @MaxLength(500)
    @IsOptional()
    @EntityDefinition.field({ label: "Lời nhắn" })
    message?: string;

    @IsDateString()
    @EntityDefinition.field({ label: "Thời điểm gửi", required: true })
    submittedAt: Date;

    @IsBoolean()
    @IsOptional()
    @EntityDefinition.field({ label: "Tham gia muộn" })
    isLateJoiner?: boolean;
}
