import {
    AllowAdminScope,
    AllowSystemRoles,
    Authorization,
    ReqUser,
} from "@common/decorator/auth.decorator";
import { AdminScope } from "@module/permission/common/constant";
import { SystemRole } from "@module/user/common/constant";
import { User } from "@module/user/entities/user.entity";
import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    Query,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { LibraryItemDto } from "./dto/library-item.dto";
import { ModuleConfigDto } from "./dto/module-config.dto";
import { ReviewSubmissionDto } from "./dto/review-submission.dto";
import { SubmissionDto } from "./dto/submission.dto";
import { LearningFlowService } from "./learning-flow.service";

/**
 * Học tập. Quản lý module: Admin tổng hoặc người được giao quyền LEARNING_MODULE
 * (quyền kiểm tra theo từng module trong service).
 */
@Controller("learning")
@ApiTags("learning")
@Authorization()
export class LearningFlowController {
    constructor(private readonly flowService: LearningFlowService) {}

    // ---- Thành viên ----

    @Get("me")
    @AllowSystemRoles(SystemRole.MENTOR, SystemRole.MENTEE)
    getMine(@ReqUser() user: User) {
        return this.flowService.getMine(user);
    }

    @Post("modules/:id/submissions")
    @AllowSystemRoles(SystemRole.MENTOR, SystemRole.MENTEE)
    submit(
        @ReqUser() user: User,
        @Param("id") id: string,
        @Body() dto: SubmissionDto,
    ) {
        return this.flowService.submit(user, id, dto.data);
    }

    @Put("modules/:id/submissions/:submissionId")
    @AllowSystemRoles(SystemRole.MENTOR, SystemRole.MENTEE)
    resubmit(
        @ReqUser() user: User,
        @Param("id") id: string,
        @Param("submissionId") submissionId: string,
        @Body() dto: SubmissionDto,
    ) {
        return this.flowService.submit(user, id, dto.data, submissionId);
    }

    @Delete("submissions/:id")
    @AllowSystemRoles(SystemRole.MENTOR, SystemRole.MENTEE)
    remove(@ReqUser() user: User, @Param("id") id: string) {
        return this.flowService.removeSubmission(user, id);
    }

    /** Thư viện sách / tài liệu (mọi người đăng nhập) */
    @Get("library")
    listLibrary(@Query("type") type?: string) {
        return this.flowService.listLibrary(type);
    }

    // ---- Quản lý ----

    @Get("modules")
    @AllowSystemRoles(SystemRole.ADMIN)
    @AllowAdminScope(AdminScope.LEARNING_MODULE)
    listModules(@ReqUser() user: User) {
        return this.flowService.listModules(user);
    }

    @Post("modules")
    @AllowSystemRoles(SystemRole.ADMIN)
    createModule(@ReqUser() user: User, @Body() dto: ModuleConfigDto) {
        return this.flowService.createModule(user, dto);
    }

    @Get("modules/:id")
    @AllowSystemRoles(SystemRole.ADMIN)
    @AllowAdminScope(AdminScope.LEARNING_MODULE)
    getModule(@ReqUser() user: User, @Param("id") id: string) {
        return this.flowService.getModuleDetail(user, id);
    }

    @Put("modules/:id")
    @AllowSystemRoles(SystemRole.ADMIN)
    @AllowAdminScope(AdminScope.LEARNING_MODULE)
    updateModule(
        @ReqUser() user: User,
        @Param("id") id: string,
        @Body() dto: ModuleConfigDto,
    ) {
        return this.flowService.updateModule(user, id, dto);
    }

    /** ?status=PENDING&cycleKey=2026-W43&period=2026-10 */
    @Get("modules/:id/submissions")
    @AllowSystemRoles(SystemRole.ADMIN)
    @AllowAdminScope(AdminScope.LEARNING_MODULE)
    listSubmissions(
        @ReqUser() user: User,
        @Param("id") id: string,
        @Query("status") status?: string,
        @Query("cycleKey") cycleKey?: string,
        @Query("period") period?: string,
        @Query("memberId") memberId?: string,
    ) {
        return this.flowService.listSubmissions(user, id, {
            status,
            cycleKey,
            period,
            memberId,
        });
    }

    @Get("modules/:id/progress")
    @AllowSystemRoles(SystemRole.ADMIN)
    @AllowAdminScope(AdminScope.LEARNING_MODULE)
    progress(
        @ReqUser() user: User,
        @Param("id") id: string,
        @Query("cycleKey") cycleKey?: string,
    ) {
        return this.flowService.progress(user, id, cycleKey);
    }

    @Put("submissions/:id/review")
    @AllowSystemRoles(SystemRole.ADMIN)
    @AllowAdminScope(AdminScope.LEARNING_MODULE)
    review(
        @ReqUser() user: User,
        @Param("id") id: string,
        @Body() dto: ReviewSubmissionDto,
    ) {
        return this.flowService.review(user, id, dto);
    }

    @Get("library/all")
    @AllowSystemRoles(SystemRole.ADMIN)
    @AllowAdminScope(AdminScope.LEARNING_MODULE)
    listAllLibrary(@Query("type") type?: string) {
        return this.flowService.listLibrary(type, true);
    }

    @Post("library")
    @AllowSystemRoles(SystemRole.ADMIN)
    @AllowAdminScope(AdminScope.LEARNING_MODULE)
    createLibraryItem(@ReqUser() user: User, @Body() dto: LibraryItemDto) {
        return this.flowService.saveLibraryItem(user, dto);
    }

    @Put("library/:id")
    @AllowSystemRoles(SystemRole.ADMIN)
    @AllowAdminScope(AdminScope.LEARNING_MODULE)
    updateLibraryItem(
        @ReqUser() user: User,
        @Param("id") id: string,
        @Body() dto: LibraryItemDto,
    ) {
        return this.flowService.saveLibraryItem(user, dto, id);
    }

    @Delete("library/:id")
    @AllowSystemRoles(SystemRole.ADMIN)
    @AllowAdminScope(AdminScope.LEARNING_MODULE)
    removeLibraryItem(@Param("id") id: string) {
        return this.flowService.removeLibraryItem(id);
    }
}
