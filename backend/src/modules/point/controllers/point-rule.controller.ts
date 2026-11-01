import { AllowAdminScope } from "@common/decorator/auth.decorator";
import { BaseControllerFactory } from "@config/controller/base-controller-factory";
import { CrudControllerConfig } from "@config/controller/crud-controller-config";
import { Controller } from "@nestjs/common";
import { AdminScope } from "@module/permission/common/constant";
import { ApiTags } from "@nestjs/swagger";
import { PointRuleConditionDto } from "../dto/point-rule-condition.dto";
import { CreatePointRuleDto } from "../dto/create-point-rule.dto";
import { UpdatePointRuleDto } from "../dto/update-point-rule.dto";
import { PointRule } from "../entities/point-rule.entity";
import { PointRuleService } from "../services/point-rule.service";

@Controller("point-rule")
@ApiTags("point-rule")
@AllowAdminScope(AdminScope.POINT)
export class PointRuleController extends BaseControllerFactory<PointRule>(
    PointRule,
    PointRuleConditionDto,
    CreatePointRuleDto,
    UpdatePointRuleDto,
    CrudControllerConfig(),
) {
    constructor(private readonly pointRuleService: PointRuleService) {
        super(pointRuleService);
    }
}
