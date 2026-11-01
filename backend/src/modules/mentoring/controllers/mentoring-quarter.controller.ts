import { AllowAdminScope } from "@common/decorator/auth.decorator";
import { BaseControllerFactory } from "@config/controller/base-controller-factory";
import { CrudControllerConfig } from "@config/controller/crud-controller-config";
import { Controller } from "@nestjs/common";
import { AdminScope } from "@module/permission/common/constant";
import { ApiTags } from "@nestjs/swagger";
import { MentoringQuarterConditionDto } from "../dto/mentoring-quarter-condition.dto";
import { CreateMentoringQuarterDto } from "../dto/create-mentoring-quarter.dto";
import { UpdateMentoringQuarterDto } from "../dto/update-mentoring-quarter.dto";
import { MentoringQuarter } from "../entities/mentoring-quarter.entity";
import { MentoringQuarterService } from "../services/mentoring-quarter.service";

@Controller("mentoring-quarter")
@ApiTags("mentoring-quarter")
@AllowAdminScope(AdminScope.MENTORING)
export class MentoringQuarterController extends BaseControllerFactory<MentoringQuarter>(
    MentoringQuarter,
    MentoringQuarterConditionDto,
    CreateMentoringQuarterDto,
    UpdateMentoringQuarterDto,
    CrudControllerConfig(),
) {
    constructor(
        private readonly mentoringQuarterService: MentoringQuarterService,
    ) {
        super(mentoringQuarterService);
    }
}
