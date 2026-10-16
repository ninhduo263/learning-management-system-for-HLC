import { Type } from "class-transformer";
import {
    ArrayMinSize,
    IsOptional,
    IsString,
    ValidateNested,
} from "class-validator";
import { ExportDefinitionQueryDto } from "./entity-definition/export-definition-query.dto";

export class ExportQueryDto {
    @IsString({ each: true })
    @IsOptional()
    ids?: string[];

    // @ValidateNested()
    // @Type(() => CommonQueryDto)
    // @IsOptional()
    // query?: CommonQueryDto;

    @ValidateNested({ each: true })
    @Type(() => ExportDefinitionQueryDto)
    @ArrayMinSize(1)
    definitions: ExportDefinitionQueryDto[];
}
