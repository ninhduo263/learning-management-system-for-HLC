import { PickType } from "@nestjs/swagger";
import { ExportDefinitionDto } from "./export-definition.dto";

export class ExportDefinitionQueryDto extends PickType(ExportDefinitionDto, [
    "fields",
    "labels",
    "children",
    "hasMany",
]) {}
