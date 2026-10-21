import { BaseControllerFactory } from "@config/controller/base-controller-factory";
import { CrudControllerConfig } from "@config/controller/crud-controller-config";
import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { LearningModuleConditionDto } from "../dto/learning-module-condition.dto";
import { CreateLearningModuleDto } from "../dto/create-learning-module.dto";
import { UpdateLearningModuleDto } from "../dto/update-learning-module.dto";
import { LearningModule } from "../entities/learning-module.entity";
import { LearningModuleService } from "../services/learning-module.service";

@Controller("learning-module")
@ApiTags("learning-module")
export class LearningModuleController extends BaseControllerFactory<LearningModule>(
    LearningModule,
    LearningModuleConditionDto,
    CreateLearningModuleDto,
    UpdateLearningModuleDto,
    CrudControllerConfig(),
) {
    constructor(private readonly learningModuleService: LearningModuleService) {
        super(learningModuleService);
    }
}
