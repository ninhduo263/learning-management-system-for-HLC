import { AllowAdminScope } from "@common/decorator/auth.decorator";
import { BaseControllerFactory } from "@config/controller/base-controller-factory";
import { CrudControllerConfig } from "@config/controller/crud-controller-config";
import { Controller } from "@nestjs/common";
import { AdminScope } from "@module/permission/common/constant";
import { ApiTags } from "@nestjs/swagger";
import { MentoringScheduleLogConditionDto } from "../dto/mentoring-schedule-log-condition.dto";
import { CreateMentoringScheduleLogDto } from "../dto/create-mentoring-schedule-log.dto";
import { UpdateMentoringScheduleLogDto } from "../dto/update-mentoring-schedule-log.dto";
import { MentoringScheduleLog } from "../entities/mentoring-schedule-log.entity";
import { MentoringScheduleLogService } from "../services/mentoring-schedule-log.service";

@Controller("mentoring-schedule-log")
@ApiTags("mentoring-schedule-log")
@AllowAdminScope(AdminScope.MENTORING)
export class MentoringScheduleLogController extends BaseControllerFactory<MentoringScheduleLog>(
    MentoringScheduleLog,
    MentoringScheduleLogConditionDto,
    CreateMentoringScheduleLogDto,
    UpdateMentoringScheduleLogDto,
    CrudControllerConfig({ readOnly: true }),
) {
    constructor(
        private readonly mentoringScheduleLogService: MentoringScheduleLogService,
    ) {
        super(mentoringScheduleLogService);
    }
}
