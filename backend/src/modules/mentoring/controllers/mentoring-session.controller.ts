import { AllowAdminScope } from "@common/decorator/auth.decorator";
import { BaseControllerFactory } from "@config/controller/base-controller-factory";
import { CrudControllerConfig } from "@config/controller/crud-controller-config";
import { Controller } from "@nestjs/common";
import { AdminScope } from "@module/permission/common/constant";
import { ApiTags } from "@nestjs/swagger";
import { MentoringSessionConditionDto } from "../dto/mentoring-session-condition.dto";
import { CreateMentoringSessionDto } from "../dto/create-mentoring-session.dto";
import { UpdateMentoringSessionDto } from "../dto/update-mentoring-session.dto";
import { MentoringSession } from "../entities/mentoring-session.entity";
import { MentoringSessionService } from "../services/mentoring-session.service";

@Controller("mentoring-session")
@ApiTags("mentoring-session")
@AllowAdminScope(AdminScope.MENTORING)
export class MentoringSessionController extends BaseControllerFactory<MentoringSession>(
    MentoringSession,
    MentoringSessionConditionDto,
    CreateMentoringSessionDto,
    UpdateMentoringSessionDto,
    CrudControllerConfig(),
) {
    constructor(
        private readonly mentoringSessionService: MentoringSessionService,
    ) {
        super(mentoringSessionService);
    }
}
