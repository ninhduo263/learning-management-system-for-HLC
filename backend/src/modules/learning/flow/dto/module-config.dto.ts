import { Type } from "class-transformer";
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
    Min,
    ValidateNested,
} from "class-validator";
import { TargetMemberType } from "@module/member/common/constant";
import { CycleType, LibraryType } from "../../common/constant";
import { ModuleCriterionConfigDto } from "./module-criterion-config.dto";
import { ModuleFieldConfigDto } from "./module-field-config.dto";

export class ModuleConfigDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    departmentId?: string;

    @IsEnum(TargetMemberType)
    @IsOptional()
    targetMemberType?: TargetMemberType;

    @IsEnum(CycleType)
    cycleType: CycleType;

    @IsInt()
    @Min(0)
    @IsOptional()
    minSubmissionsPerCycle?: number;

    @IsInt()
    @Min(1)
    @IsOptional()
    maxSubmissionsPerCycle?: number;

    @IsEnum(LibraryType)
    @IsOptional()
    libraryType?: LibraryType;

    @IsBoolean()
    @IsOptional()
    requireReview?: boolean;

    @IsBoolean()
    @IsOptional()
    enableScoring?: boolean;

    @IsNumber()
    @Min(1)
    @IsOptional()
    maxScore?: number;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @IsInt()
    @IsOptional()
    sortOrder?: number;

    @ValidateNested({ each: true })
    @Type(() => ModuleFieldConfigDto)
    @IsArray()
    fields: ModuleFieldConfigDto[];

    @ValidateNested({ each: true })
    @Type(() => ModuleCriterionConfigDto)
    @IsArray()
    @IsOptional()
    criteria?: ModuleCriterionConfigDto[];
}
