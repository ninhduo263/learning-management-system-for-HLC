import { BaseControllerFactory } from "@config/controller/base-controller-factory";
import { CrudControllerConfig } from "@config/controller/crud-controller-config";
import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ModuleFieldConditionDto } from "../dto/module-field-condition.dto";
import { CreateModuleFieldDto } from "../dto/create-module-field.dto";
import { UpdateModuleFieldDto } from "../dto/update-module-field.dto";
import { ModuleField } from "../entities/module-field.entity";
import { ModuleFieldService } from "../services/module-field.service";

@Controller("module-field")
@ApiTags("module-field")
export class ModuleFieldController extends BaseControllerFactory<ModuleField>(
    ModuleField,
    ModuleFieldConditionDto,
    CreateModuleFieldDto,
    UpdateModuleFieldDto,
    CrudControllerConfig(),
) {
    constructor(private readonly moduleFieldService: ModuleFieldService) {
        super(moduleFieldService);
    }
}
