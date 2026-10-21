import { AllowAdminScope } from "@common/decorator/auth.decorator";
import { BaseControllerFactory } from "@config/controller/base-controller-factory";
import { CrudControllerConfig } from "@config/controller/crud-controller-config";
import { Controller } from "@nestjs/common";
import { AdminScope } from "@module/permission/common/constant";
import { ApiTags } from "@nestjs/swagger";
import { MentoringPairConditionDto } from "../dto/mentoring-pair-condition.dto";
import { CreateMentoringPairDto } from "../dto/create-mentoring-pair.dto";
import { UpdateMentoringPairDto } from "../dto/update-mentoring-pair.dto";
import { MentoringPair } from "../entities/mentoring-pair.entity";
import { MentoringPairService } from "../services/mentoring-pair.service";

@Controller("mentoring-pair")
@ApiTags("mentoring-pair")
@AllowAdminScope(AdminScope.MENTORING)
export class MentoringPairController extends BaseControllerFactory<MentoringPair>(
    MentoringPair,
    MentoringPairConditionDto,
    CreateMentoringPairDto,
    UpdateMentoringPairDto,
    CrudControllerConfig(),
) {
    constructor(private readonly mentoringPairService: MentoringPairService) {
        super(mentoringPairService);
    }
}
