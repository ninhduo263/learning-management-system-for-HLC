import { PartialType } from "@nestjs/swagger";
import { ModuleField } from "../entities/module-field.entity";

export class ModuleFieldConditionDto extends PartialType(ModuleField) {}
