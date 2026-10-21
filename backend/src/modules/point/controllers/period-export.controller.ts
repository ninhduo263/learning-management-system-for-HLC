import { AllowAdminScope } from "@common/decorator/auth.decorator";
import { BaseControllerFactory } from "@config/controller/base-controller-factory";
import { CrudControllerConfig } from "@config/controller/crud-controller-config";
import { Controller } from "@nestjs/common";
import { AdminScope } from "@module/permission/common/constant";
import { ApiTags } from "@nestjs/swagger";
import { PeriodExportConditionDto } from "../dto/period-export-condition.dto";
import { CreatePeriodExportDto } from "../dto/create-period-export.dto";
import { UpdatePeriodExportDto } from "../dto/update-period-export.dto";
import { PeriodExport } from "../entities/period-export.entity";
import { PeriodExportService } from "../services/period-export.service";

@Controller("period-export")
@ApiTags("period-export")
@AllowAdminScope(AdminScope.POINT)
export class PeriodExportController extends BaseControllerFactory<PeriodExport>(
    PeriodExport,
    PeriodExportConditionDto,
    CreatePeriodExportDto,
    UpdatePeriodExportDto,
    CrudControllerConfig({ readOnly: true }),
) {
    constructor(private readonly periodExportService: PeriodExportService) {
        super(periodExportService);
    }
}
