import { OmitType } from "@nestjs/swagger";
import { EntityDefinitionDto } from "./entity-definition.dto";

export class ImportDefinitionDto extends OmitType(EntityDefinitionDto, [
    "disableImport",
    "propertyTarget",
]) {}
