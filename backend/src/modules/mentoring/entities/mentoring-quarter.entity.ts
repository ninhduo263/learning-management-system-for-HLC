import { EntityDefinition } from "@common/constant/class/entity-definition";
import { IsYYYYMMDD } from "@common/decorator/validate.decorator";
import { BaseEntity } from "@common/interface/base-entity.interface";
import {
    IsBoolean,
    IsDateString,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
} from "class-validator";
import { MentoringQuarterStatus } from "../common/constant";

export class MentoringQuarter implements BaseEntity {
    _id: string;

    @IsString()
    @MaxLength(6)
    @EntityDefinition.field({ label: "Mã quý", required: true })
    code: string;

    @IsInt()
    @EntityDefinition.field({ label: "Năm", required: true })
    year: number;

    @IsInt()
    @EntityDefinition.field({ label: "Quý", required: true })
    quarter: number;

    @IsYYYYMMDD()
    @EntityDefinition.field({ label: "Ngày bắt đầu", required: true })
    startDate: string;

    @IsYYYYMMDD()
    @EntityDefinition.field({ label: "Ngày kết thúc", required: true })
    endDate: string;

    @IsDateString()
    @EntityDefinition.field({ label: "Mở nguyện vọng", required: true })
    preferenceOpenAt: Date;

    @IsDateString()
    @EntityDefinition.field({ label: "Mở ghép cặp", required: true })
    pairingOpenAt: Date;

    @IsDateString()
    @EntityDefinition.field({ label: "Công bố cặp", required: true })
    visibleAt: Date;

    @IsEnum(MentoringQuarterStatus)
    @IsOptional()
    @EntityDefinition.field({
        label: "Trạng thái",
        enum: Object.values(MentoringQuarterStatus),
    })
    status?: MentoringQuarterStatus;

    @IsBoolean()
    @IsOptional()
    @EntityDefinition.field({ label: "Đã khóa" })
    isLocked?: boolean;

    @IsDateString()
    @IsOptional()
    @EntityDefinition.field({ label: "Thời điểm khóa" })
    lockedAt?: Date;

    @IsString()
    @MaxLength(24)
    @IsOptional()
    @EntityDefinition.field({ label: "Người khóa" })
    lockedBy?: string;

    @IsString()
    @MaxLength(24)
    @IsOptional()
    @EntityDefinition.field({ label: "Người tạo" })
    createdBy?: string;
}
