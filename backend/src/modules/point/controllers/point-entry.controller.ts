import { AllowAdminScope } from "@common/decorator/auth.decorator";
import { BaseControllerFactory } from "@config/controller/base-controller-factory";
import { CrudControllerConfig } from "@config/controller/crud-controller-config";
import { Controller } from "@nestjs/common";
import { AdminScope } from "@module/permission/common/constant";
import { ApiTags } from "@nestjs/swagger";
import { PointEntryConditionDto } from "../dto/point-entry-condition.dto";
import { CreatePointEntryDto } from "../dto/create-point-entry.dto";
import { UpdatePointEntryDto } from "../dto/update-point-entry.dto";
import { PointEntry } from "../entities/point-entry.entity";
import { PointEntryService } from "../services/point-entry.service";

@Controller("point-entry")
@ApiTags("point-entry")
@AllowAdminScope(AdminScope.POINT)
export class PointEntryController extends BaseControllerFactory<PointEntry>(
    PointEntry,
    PointEntryConditionDto,
    CreatePointEntryDto,
    UpdatePointEntryDto,
    CrudControllerConfig({ readOnly: true }),
) {
    constructor(private readonly pointEntryService: PointEntryService) {
        super(pointEntryService);
    }
}
