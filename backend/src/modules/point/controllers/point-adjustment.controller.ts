import { AllowAdminScope } from "@common/decorator/auth.decorator";
import { BaseControllerFactory } from "@config/controller/base-controller-factory";
import { CrudControllerConfig } from "@config/controller/crud-controller-config";
import { Controller } from "@nestjs/common";
import { AdminScope } from "@module/permission/common/constant";
import { ApiTags } from "@nestjs/swagger";
import { PointAdjustmentConditionDto } from "../dto/point-adjustment-condition.dto";
import { CreatePointAdjustmentDto } from "../dto/create-point-adjustment.dto";
import { UpdatePointAdjustmentDto } from "../dto/update-point-adjustment.dto";
import { PointAdjustment } from "../entities/point-adjustment.entity";
import { PointAdjustmentService } from "../services/point-adjustment.service";

@Controller("point-adjustment")
@ApiTags("point-adjustment")
@AllowAdminScope(AdminScope.POINT)
export class PointAdjustmentController extends BaseControllerFactory<PointAdjustment>(
    PointAdjustment,
    PointAdjustmentConditionDto,
    CreatePointAdjustmentDto,
    UpdatePointAdjustmentDto,
    // Chỉ đọc: điều chỉnh điểm ghi qua /points/periods/:code/adjustments (kiểm tra kỳ chốt, quyền sửa điểm, nhật ký)
    CrudControllerConfig({ readOnly: true }),
) {
    constructor(
        private readonly pointAdjustmentService: PointAdjustmentService,
    ) {
        super(pointAdjustmentService);
    }
}
