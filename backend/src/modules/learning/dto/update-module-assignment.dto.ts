import { PartialType } from "@nestjs/swagger";
import { CreateModuleAssignmentDto } from "./create-module-assignment.dto";

export class UpdateModuleAssignmentDto extends PartialType(
    CreateModuleAssignmentDto,
) {}
