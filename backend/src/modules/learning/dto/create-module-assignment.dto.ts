import { OmitType } from "@nestjs/swagger";
import { ModuleAssignment } from "../entities/module-assignment.entity";

export class CreateModuleAssignmentDto extends OmitType(ModuleAssignment, [
    "_id",
]) {}
