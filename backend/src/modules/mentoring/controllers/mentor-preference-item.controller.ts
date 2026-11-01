import { AllowAdminScope } from "@common/decorator/auth.decorator";
import { BaseControllerFactory } from "@config/controller/base-controller-factory";
import { CrudControllerConfig } from "@config/controller/crud-controller-config";
import { Controller } from "@nestjs/common";
import { AdminScope } from "@module/permission/common/constant";
import { ApiTags } from "@nestjs/swagger";
import { MentorPreferenceItemConditionDto } from "../dto/mentor-preference-item-condition.dto";
import { CreateMentorPreferenceItemDto } from "../dto/create-mentor-preference-item.dto";
import { UpdateMentorPreferenceItemDto } from "../dto/update-mentor-preference-item.dto";
import { MentorPreferenceItem } from "../entities/mentor-preference-item.entity";
import { MentorPreferenceItemService } from "../services/mentor-preference-item.service";

@Controller("mentor-preference-item")
@ApiTags("mentor-preference-item")
@AllowAdminScope(AdminScope.MENTORING)
export class MentorPreferenceItemController extends BaseControllerFactory<MentorPreferenceItem>(
    MentorPreferenceItem,
    MentorPreferenceItemConditionDto,
    CreateMentorPreferenceItemDto,
    UpdateMentorPreferenceItemDto,
    CrudControllerConfig(),
) {
    constructor(
        private readonly mentorPreferenceItemService: MentorPreferenceItemService,
    ) {
        super(mentorPreferenceItemService);
    }
}
