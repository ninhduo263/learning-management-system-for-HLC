import { BaseRepository } from "@module/repository/common/base-repository.interface";
import { ModuleAssignment } from "../entities/module-assignment.entity";

export interface ModuleAssignmentRepository
    extends BaseRepository<ModuleAssignment> {}
