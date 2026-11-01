import { AllowAdminScope } from "@common/decorator/auth.decorator";
import { BaseControllerFactory } from "@config/controller/base-controller-factory";
import { CrudControllerConfig } from "@config/controller/crud-controller-config";
import { Controller } from "@nestjs/common";
import { AdminScope } from "@module/permission/common/constant";
import { ApiTags } from "@nestjs/swagger";
import { FundContributionConditionDto } from "../dto/fund-contribution-condition.dto";
import { CreateFundContributionDto } from "../dto/create-fund-contribution.dto";
import { UpdateFundContributionDto } from "../dto/update-fund-contribution.dto";
import { FundContribution } from "../entities/fund-contribution.entity";
import { FundContributionService } from "../services/fund-contribution.service";

@Controller("fund-contribution")
@ApiTags("fund-contribution")
@AllowAdminScope(AdminScope.FUND)
export class FundContributionController extends BaseControllerFactory<FundContribution>(
    FundContribution,
    FundContributionConditionDto,
    CreateFundContributionDto,
    UpdateFundContributionDto,
    CrudControllerConfig(),
) {
    constructor(
        private readonly fundContributionService: FundContributionService,
    ) {
        super(fundContributionService);
    }
}
