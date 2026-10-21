import { PartialType } from "@nestjs/swagger";
import { CreateModuleFieldDto } from "./create-module-field.dto";

export class UpdateModuleFieldDto extends PartialType(CreateModuleFieldDto) {}
