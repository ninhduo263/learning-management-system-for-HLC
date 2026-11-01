import { AllowAdminScope } from "@common/decorator/auth.decorator";
import { BaseControllerFactory } from "@config/controller/base-controller-factory";
import { CrudControllerConfig } from "@config/controller/crud-controller-config";
import { Controller } from "@nestjs/common";
import { AdminScope } from "@module/permission/common/constant";
import { ApiTags } from "@nestjs/swagger";
import { MentoringAwardConditionDto } from "../dto/mentoring-award-condition.dto";
import { CreateMentoringAwardDto } from "../dto/create-mentoring-award.dto";
import { UpdateMentoringAwardDto } from "../dto/update-mentoring-award.dto";
import { MentoringAward } from "../entities/mentoring-award.entity";
import { MentoringAwardService } from "../services/mentoring-award.service";

@Controller("mentoring-award")
@ApiTags("mentoring-award")
@AllowAdminScope(AdminScope.MENTORING)
export class MentoringAwardController extends BaseControllerFactory<MentoringAward>(
    MentoringAward,
    MentoringAwardConditionDto,
    CreateMentoringAwardDto,
    UpdateMentoringAwardDto,
    CrudControllerConfig(),
) {
    constructor(private readonly mentoringAwardService: MentoringAwardService) {
        super(mentoringAwardService);
    }
}
