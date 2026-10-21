import { EntityDefinition } from "@common/constant/class/entity-definition";
import { BaseEntity } from "@common/interface/base-entity.interface";
import {
    IsDateString,
    IsEnum,
    IsOptional,
    IsString,
    MaxLength,
} from "class-validator";
import { PeriodExportType } from "../common/constant";

export class PeriodExport implements BaseEntity {
    _id: string;

    @IsString()
    @MaxLength(24)
    @EntityDefinition.field({ label: "Kỳ tháng", required: true })
    periodId: string;

    @IsEnum(PeriodExportType)
    @EntityDefinition.field({
        label: "Loại file",
        required: true,
        enum: Object.values(PeriodExportType),
    })
    exportType: PeriodExportType;

    @IsString()
    @EntityDefinition.field({ label: "File", required: true })
    fileUrl: string;

    @IsString()
    @MaxLength(64)
    @IsOptional()
    @EntityDefinition.field({ label: "Checksum" })
    checksum?: string;

    @IsString()
    @MaxLength(24)
    @IsOptional()
    @EntityDefinition.field({ label: "Người xuất" })
    exportedBy?: string;

    @IsDateString()
    @IsOptional()
    @EntityDefinition.field({ label: "Thời điểm xuất" })
    exportedAt?: Date;

    @IsString()
    @IsOptional()
    @EntityDefinition.field({ label: "Ghi chú" })
    note?: string;
}
