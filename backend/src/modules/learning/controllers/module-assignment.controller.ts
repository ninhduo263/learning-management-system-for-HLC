import { BaseControllerFactory } from "@config/controller/base-controller-factory";
import { CrudControllerConfig } from "@config/controller/crud-controller-config";
import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ModuleAssignmentConditionDto } from "../dto/module-assignment-condition.dto";
import { CreateModuleAssignmentDto } from "../dto/create-module-assignment.dto";
import { UpdateModuleAssignmentDto } from "../dto/update-module-assignment.dto";
import { ModuleAssignment } from "../entities/module-assignment.entity";
import { ModuleAssignmentService } from "../services/module-assignment.service";

@Controller("module-assignment")
@ApiTags("module-assignment")
export class ModuleAssignmentController extends BaseControllerFactory<ModuleAssignment>(
    ModuleAssignment,
    ModuleAssignmentConditionDto,
    CreateModuleAssignmentDto,
    UpdateModuleAssignmentDto,
    CrudControllerConfig(),
) {
    constructor(
        private readonly moduleAssignmentService: ModuleAssignmentService,
    ) {
        super(moduleAssignmentService);
    }
}
