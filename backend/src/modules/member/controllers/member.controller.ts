import { AllowSystemRoles, ReqUser } from "@common/decorator/auth.decorator";
import { BaseControllerFactory } from "@config/controller/base-controller-factory";
import { CrudControllerConfig } from "@config/controller/crud-controller-config";
import { ApiError } from "@config/exception/api-error";
import { SystemRole } from "@module/user/common/constant";
import { User } from "@module/user/entities/user.entity";
import {
    Body,
    Controller,
    Get,
    Post,
    UploadedFile,
    UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBody, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { CreateMemberDto } from "../dto/create-member.dto";
import { GenerateAccountsDto } from "../dto/generate-accounts.dto";
import { MemberConditionDto } from "../dto/member-condition.dto";
import { UpdateMemberDto } from "../dto/update-member.dto";
import { Member } from "../entities/member.entity";
import { MemberToolsService } from "../services/member-tools.service";
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
    constructor(
        private readonly memberService: MemberService,
        private readonly memberToolsService: MemberToolsService,
    ) {
        super(memberService);
    }

    /** Hồ sơ thành viên của tài khoản đang đăng nhập (null nếu chưa liên kết) */
    @Get("me")
    getMe(@ReqUser() user: User) {
        return this.memberToolsService.getMemberOfUser(user);
    }

    @Post("import-file")
    @AllowSystemRoles(SystemRole.ADMIN)
    @ApiConsumes("multipart/form-data")
    @ApiBody({
        schema: {
            type: "object",
            properties: { file: { type: "string", format: "binary" } },
        },
    })
    @UseInterceptors(
        FileInterceptor("file", { limits: { fileSize: 5 * 1024 * 1024 } }),
    )
    importFile(@UploadedFile() file: Express.Multer.File) {
        if (!file?.buffer?.length)
            throw ApiError.BadRequest("error-import-file-invalid");
        return this.memberToolsService.importFile(file.buffer);
    }

    @Post("accounts/generate")
    @AllowSystemRoles(SystemRole.ADMIN)
    generateAccounts(@Body() dto: GenerateAccountsDto) {
        return this.memberToolsService.generateAccounts(dto);
    }
}
