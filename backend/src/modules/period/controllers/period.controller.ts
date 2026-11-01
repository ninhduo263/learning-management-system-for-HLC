import { BaseControllerFactory } from "@config/controller/base-controller-factory";
import { CrudControllerConfig } from "@config/controller/crud-controller-config";
import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PeriodConditionDto } from "../dto/period-condition.dto";
import { CreatePeriodDto } from "../dto/create-period.dto";
import { UpdatePeriodDto } from "../dto/update-period.dto";
import { Period } from "../entities/period.entity";
import { PeriodService } from "../services/period.service";

@Controller("period")
@ApiTags("period")
export class PeriodController extends BaseControllerFactory<Period>(
    Period,
    PeriodConditionDto,
    CreatePeriodDto,
    UpdatePeriodDto,
    CrudControllerConfig(),
) {
    constructor(private readonly periodService: PeriodService) {
        super(periodService);
    }
}
