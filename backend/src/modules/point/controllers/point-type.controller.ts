import { AllowAdminScope } from "@common/decorator/auth.decorator";
import { BaseControllerFactory } from "@config/controller/base-controller-factory";
import { CrudControllerConfig } from "@config/controller/crud-controller-config";
import { Controller } from "@nestjs/common";
import { AdminScope } from "@module/permission/common/constant";
import { ApiTags } from "@nestjs/swagger";
import { PointTypeConditionDto } from "../dto/point-type-condition.dto";
import { CreatePointTypeDto } from "../dto/create-point-type.dto";
import { UpdatePointTypeDto } from "../dto/update-point-type.dto";
import { PointType } from "../entities/point-type.entity";
import { PointTypeService } from "../services/point-type.service";

@Controller("point-type")
@ApiTags("point-type")
@AllowAdminScope(AdminScope.POINT)
export class PointTypeController extends BaseControllerFactory<PointType>(
    PointType,
    PointTypeConditionDto,
    CreatePointTypeDto,
    UpdatePointTypeDto,
    CrudControllerConfig(),
) {
    constructor(private readonly pointTypeService: PointTypeService) {
        super(pointTypeService);
    }
}
