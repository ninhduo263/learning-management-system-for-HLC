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
    Param,
    Post,
    Put,
    UploadedFile,
    UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBody, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { CreateMemberDto } from "../dto/create-member.dto";
import { AdminProfileDto } from "../dto/admin-profile.dto";
import { GenerateAccountsDto } from "../dto/generate-accounts.dto";
import { SelfProfileDto } from "../dto/self-profile.dto";
import { MemberConditionDto } from "../dto/member-condition.dto";
import { UpdateMemberDto } from "../dto/update-member.dto";
import { Member } from "../entities/member.entity";
import { MemberProfileService } from "../services/member-profile.service";
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
        private readonly profileService: MemberProfileService,
    ) {
        super(memberService);
    }

    /** Hồ sơ thành viên của tài khoản đang đăng nhập (null nếu chưa liên kết) */
    @Get("me")
    getMe(@ReqUser() user: User) {
        return this.memberToolsService.getMemberOfUser(user);
    }

    /** Hồ sơ đầy đủ của chính mình (kể cả thông tin ngân hàng) */
    @Get("me/profile")
    @AllowSystemRoles(SystemRole.MENTOR, SystemRole.MENTEE)
    getMyProfile(@ReqUser() user: User) {
        return this.profileService.getOwn(user);
    }

    /** Thành viên tự sửa hồ sơ; mọi thay đổi được ghi lịch sử */
    @Put("me/profile")
    @AllowSystemRoles(SystemRole.MENTOR, SystemRole.MENTEE)
    updateMyProfile(@ReqUser() user: User, @Body() dto: SelfProfileDto) {
        return this.profileService.updateOwn(user, { ...dto });
    }

    @Get("me/profile-logs")
    @AllowSystemRoles(SystemRole.MENTOR, SystemRole.MENTEE)
    getMyProfileLogs(@ReqUser() user: User) {
        return this.profileService.ownLogs(user);
    }

    @Put(":id/profile")
    @AllowSystemRoles(SystemRole.ADMIN)
    updateProfile(
        @ReqUser() user: User,
        @Param("id") id: string,
        @Body() dto: AdminProfileDto,
    ) {
        return this.profileService.updateByAdmin(user, id, { ...dto });
    }

    @Get(":id/profile-logs")
    @AllowSystemRoles(SystemRole.ADMIN)
    getProfileLogs(@Param("id") id: string) {
        return this.profileService.logs(id);
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
