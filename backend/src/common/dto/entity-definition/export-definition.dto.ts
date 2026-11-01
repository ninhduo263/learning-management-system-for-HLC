import { OmitType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsString, ValidateNested } from "class-validator";
import { EntityDefinitionDto } from "./entity-definition.dto";

export class ExportDefinitionDto extends OmitType(EntityDefinitionDto, [
    // "disableImport",
    "field",
    "propertyTarget",
]) {
    @IsString({ each: true })
    fields: string[];

    @IsString({ each: true })
    labels: string[];

    @ValidateNested({ each: true })
    @Type(() => ExportDefinitionDto)
    children: ExportDefinitionDto[];
}
