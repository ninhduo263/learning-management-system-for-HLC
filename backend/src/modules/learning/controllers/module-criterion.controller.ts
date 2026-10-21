import { BaseControllerFactory } from "@config/controller/base-controller-factory";
import { CrudControllerConfig } from "@config/controller/crud-controller-config";
import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ModuleCriterionConditionDto } from "../dto/module-criterion-condition.dto";
import { CreateModuleCriterionDto } from "../dto/create-module-criterion.dto";
import { UpdateModuleCriterionDto } from "../dto/update-module-criterion.dto";
import { ModuleCriterion } from "../entities/module-criterion.entity";
import { ModuleCriterionService } from "../services/module-criterion.service";

@Controller("module-criterion")
@ApiTags("module-criterion")
export class ModuleCriterionController extends BaseControllerFactory<ModuleCriterion>(
    ModuleCriterion,
    ModuleCriterionConditionDto,
    CreateModuleCriterionDto,
    UpdateModuleCriterionDto,
    CrudControllerConfig(),
) {
    constructor(
        private readonly moduleCriterionService: ModuleCriterionService,
    ) {
        super(moduleCriterionService);
    }
}
