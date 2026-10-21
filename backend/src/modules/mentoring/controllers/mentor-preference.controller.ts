import { AllowAdminScope } from "@common/decorator/auth.decorator";
import { BaseControllerFactory } from "@config/controller/base-controller-factory";
import { CrudControllerConfig } from "@config/controller/crud-controller-config";
import { Controller } from "@nestjs/common";
import { AdminScope } from "@module/permission/common/constant";
import { ApiTags } from "@nestjs/swagger";
import { MentorPreferenceConditionDto } from "../dto/mentor-preference-condition.dto";
import { CreateMentorPreferenceDto } from "../dto/create-mentor-preference.dto";
import { UpdateMentorPreferenceDto } from "../dto/update-mentor-preference.dto";
import { MentorPreference } from "../entities/mentor-preference.entity";
import { MentorPreferenceService } from "../services/mentor-preference.service";

@Controller("mentor-preference")
@ApiTags("mentor-preference")
@AllowAdminScope(AdminScope.MENTORING)
export class MentorPreferenceController extends BaseControllerFactory<MentorPreference>(
    MentorPreference,
    MentorPreferenceConditionDto,
    CreateMentorPreferenceDto,
    UpdateMentorPreferenceDto,
    CrudControllerConfig(),
) {
    constructor(
        private readonly mentorPreferenceService: MentorPreferenceService,
    ) {
        super(mentorPreferenceService);
    }
}
