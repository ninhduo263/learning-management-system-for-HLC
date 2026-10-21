import { PartialType } from "@nestjs/swagger";
import { ModuleAssignment } from "../entities/module-assignment.entity";

export class ModuleAssignmentConditionDto extends PartialType(
    ModuleAssignment,
) {}
