import { BaseControllerFactory } from "@config/controller/base-controller-factory";
import { CrudControllerConfig } from "@config/controller/crud-controller-config";
import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { MemberPositionConditionDto } from "../dto/member-position-condition.dto";
import { CreateMemberPositionDto } from "../dto/create-member-position.dto";
import { UpdateMemberPositionDto } from "../dto/update-member-position.dto";
import { MemberPosition } from "../entities/member-position.entity";
import { MemberPositionService } from "../services/member-position.service";

@Controller("member-position")
@ApiTags("member-position")
export class MemberPositionController extends BaseControllerFactory<MemberPosition>(
    MemberPosition,
    MemberPositionConditionDto,
    CreateMemberPositionDto,
    UpdateMemberPositionDto,
    CrudControllerConfig(),
) {
    constructor(private readonly memberPositionService: MemberPositionService) {
        super(memberPositionService);
    }
}
