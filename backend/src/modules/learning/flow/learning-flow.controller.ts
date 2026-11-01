import { ModuleAudienceDto } from "./dto/module-audience.dto";
import { ModuleAdminsDto } from "./dto/module-admins.dto";
import { ModuleAdminService } from "./module-admin.service";
import { ModuleAudienceService } from "./module-audience.service";
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
    Res,
    UploadedFile,
    UseInterceptors,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { LibraryItemDto } from "./dto/library-item.dto";
import { ModuleConfigDto } from "./dto/module-config.dto";
import { ReviewSubmissionDto } from "./dto/review-submission.dto";
import { SubmissionDto } from "./dto/submission.dto";
import { LearningFlowService } from "./learning-flow.service";
import { LibraryExcelService } from "./library-excel.service";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiError } from "@config/exception/api-error";
import { Response } from "express";

/**
 * Học tập. Quản lý module: Admin tổng hoặc người được giao quyền LEARNING_MODULE
 * (quyền kiểm tra theo từng module trong service).
 */
@Controller("learning")
@ApiTags("learning")
@Authorization()
export class LearningFlowController {
    constructor(
        private readonly flowService: LearningFlowService,
        private readonly libraryExcel: LibraryExcelService,
        private readonly audience: ModuleAudienceService,
        private readonly moduleAdmins: ModuleAdminService,
    ) {}

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
    @AllowAdminScope(AdminScope.LEARNING)
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

    /** Người / nhóm được gán module */
    @Get("modules/:id/audience")
    @AllowSystemRoles(SystemRole.ADMIN)
    @AllowAdminScope(AdminScope.LEARNING_MODULE)
    async getAudience(@ReqUser() user: User, @Param("id") id: string) {
        await this.flowService.assertCanManage(user, id);
        return this.audience.get(id);
    }

    /** Người giữ chức vụ "Admin module <tên>" của module */
    @Get("modules/:id/admins")
    @AllowSystemRoles(SystemRole.ADMIN)
    @AllowAdminScope(AdminScope.LEARNING_MODULE)
    async getModuleAdmins(@ReqUser() user: User, @Param("id") id: string) {
        await this.flowService.assertCanManage(user, id);
        return this.moduleAdmins.list(id);
    }

    /** Chỉ Admin toàn cục và Trưởng ban Học tập chỉ định admin module nhỏ (admin module nhỏ không tự đổi) */
    @Put("modules/:id/admins")
    @AllowSystemRoles(SystemRole.ADMIN)
    @AllowAdminScope(AdminScope.LEARNING)
    saveModuleAdmins(
        @ReqUser() user: User,
        @Param("id") id: string,
        @Body() dto: ModuleAdminsDto,
    ) {
        return this.moduleAdmins.save(user, id, dto.memberIds);
    }

    @Put("modules/:id/audience")
    @AllowSystemRoles(SystemRole.ADMIN)
    @AllowAdminScope(AdminScope.LEARNING_MODULE)
    async saveAudience(
        @ReqUser() user: User,
        @Param("id") id: string,
        @Body() dto: ModuleAudienceDto,
    ) {
        await this.flowService.assertCanConfigure(user, id);
        return this.audience.save(user, id, dto);
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

    /** Xuất danh sách sách ra .xlsx */
    @Get("library/export.xlsx")
    @AllowSystemRoles(SystemRole.ADMIN)
    @AllowAdminScope(AdminScope.LEARNING_MODULE)
    async exportLibrary(@Res() res: Response) {
        const { fileName, buffer } = await this.libraryExcel.export();
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${fileName}"`,
        );
        res.send(buffer);
    }

    /** Nhập hàng loạt sách (có link Google Drive PDF): ?dryRun=true chỉ kiểm tra */
    @Post("library/import")
    @AllowSystemRoles(SystemRole.ADMIN)
    @AllowAdminScope(AdminScope.LEARNING_MODULE)
    @UseInterceptors(
        FileInterceptor("file", { limits: { fileSize: 5 * 1024 * 1024 } }),
    )
    importLibrary(
        @ReqUser() user: User,
        @UploadedFile() file: Express.Multer.File,
        @Query("dryRun") dryRun?: string,
    ) {
        if (!file?.buffer?.length)
            throw ApiError.BadRequest("error-import-file-invalid");
        return this.libraryExcel.import(file.buffer, user, dryRun === "true");
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
