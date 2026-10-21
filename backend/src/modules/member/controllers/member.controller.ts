import { BaseControllerFactory } from "@config/controller/base-controller-factory";
import { CrudControllerConfig } from "@config/controller/crud-controller-config";
import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { MemberConditionDto } from "../dto/member-condition.dto";
import { CreateMemberDto } from "../dto/create-member.dto";
import { UpdateMemberDto } from "../dto/update-member.dto";
import { Member } from "../entities/member.entity";
import { MemberService } from "../services/member.service";

@Controller("member")
@ApiTags("member")
export class MemberController extends BaseControllerFactory<Member>(
    Member,
    MemberConditionDto,
    CreateMemberDto,
    UpdateMemberDto,
    CrudControllerConfig({ enableImport: true }),
) {
    constructor(private readonly memberService: MemberService) {
        super(memberService);
    }
}
