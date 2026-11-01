import { AllowAdminScope } from "@common/decorator/auth.decorator";
import { BaseControllerFactory } from "@config/controller/base-controller-factory";
import { CrudControllerConfig } from "@config/controller/crud-controller-config";
import { Controller } from "@nestjs/common";
import { AdminScope } from "@module/permission/common/constant";
import { ApiTags } from "@nestjs/swagger";
import { MentoringRecapConditionDto } from "../dto/mentoring-recap-condition.dto";
import { CreateMentoringRecapDto } from "../dto/create-mentoring-recap.dto";
import { UpdateMentoringRecapDto } from "../dto/update-mentoring-recap.dto";
import { MentoringRecap } from "../entities/mentoring-recap.entity";
import { MentoringRecapService } from "../services/mentoring-recap.service";

@Controller("mentoring-recap")
@ApiTags("mentoring-recap")
@AllowAdminScope(AdminScope.MENTORING)
export class MentoringRecapController extends BaseControllerFactory<MentoringRecap>(
    MentoringRecap,
    MentoringRecapConditionDto,
    CreateMentoringRecapDto,
    UpdateMentoringRecapDto,
    CrudControllerConfig(),
) {
    constructor(private readonly mentoringRecapService: MentoringRecapService) {
        super(mentoringRecapService);
    }
}
