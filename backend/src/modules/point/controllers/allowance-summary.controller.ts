import { AllowAdminScope } from "@common/decorator/auth.decorator";
import { BaseControllerFactory } from "@config/controller/base-controller-factory";
import { CrudControllerConfig } from "@config/controller/crud-controller-config";
import { Controller } from "@nestjs/common";
import { AdminScope } from "@module/permission/common/constant";
import { ApiTags } from "@nestjs/swagger";
import { AllowanceSummaryConditionDto } from "../dto/allowance-summary-condition.dto";
import { CreateAllowanceSummaryDto } from "../dto/create-allowance-summary.dto";
import { UpdateAllowanceSummaryDto } from "../dto/update-allowance-summary.dto";
import { AllowanceSummary } from "../entities/allowance-summary.entity";
import { AllowanceSummaryService } from "../services/allowance-summary.service";

@Controller("allowance-summary")
@ApiTags("allowance-summary")
@AllowAdminScope(AdminScope.POINT)
export class AllowanceSummaryController extends BaseControllerFactory<AllowanceSummary>(
    AllowanceSummary,
    AllowanceSummaryConditionDto,
    CreateAllowanceSummaryDto,
    UpdateAllowanceSummaryDto,
    CrudControllerConfig({ readOnly: true }),
) {
    constructor(
        private readonly allowanceSummaryService: AllowanceSummaryService,
    ) {
        super(allowanceSummaryService);
    }
}
