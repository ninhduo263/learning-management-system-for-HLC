import { EntityDefinition } from "@common/constant/class/entity-definition";
import { BaseEntity } from "@common/interface/base-entity.interface";
import {
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
} from "class-validator";
import { MentoringPairSource, MentoringPairStatus } from "../common/constant";

export class MentoringPair implements BaseEntity {
    _id: string;

    @IsString()
    @MaxLength(24)
    @EntityDefinition.field({ label: "Quý", required: true })
    quarterId: string;

    @IsString()
    @MaxLength(24)
    @EntityDefinition.field({ label: "Mentor", required: true })
    mentorId: string;

    @IsString()
    @MaxLength(24)
    @EntityDefinition.field({ label: "Mentee", required: true })
    menteeId: string;

    @IsString()
    @MaxLength(64)
    @EntityDefinition.field({ label: "Mã cặp", required: true })
    code: string;

    @IsEnum(MentoringPairStatus)
    @IsOptional()
    @EntityDefinition.field({
        label: "Trạng thái",
        enum: Object.values(MentoringPairStatus),
    })
    status?: MentoringPairStatus;

    @IsEnum(MentoringPairSource)
    @IsOptional()
    @EntityDefinition.field({
        label: "Nguồn ghép",
        enum: Object.values(MentoringPairSource),
    })
    source?: MentoringPairSource;

    @IsInt()
    @IsOptional()
    @EntityDefinition.field({ label: "Thứ tự" })
    sortOrder?: number;

    @IsString()
    @IsOptional()
    @EntityDefinition.field({ label: "Ghi chú" })
    note?: string;

    @IsString()
    @MaxLength(24)
    @IsOptional()
    @EntityDefinition.field({ label: "Người tạo" })
    createdBy?: string;
}
