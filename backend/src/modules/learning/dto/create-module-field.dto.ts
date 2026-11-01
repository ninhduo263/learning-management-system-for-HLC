import { OmitType } from "@nestjs/swagger";
import { ModuleField } from "../entities/module-field.entity";

export class CreateModuleFieldDto extends OmitType(ModuleField, ["_id"]) {}
