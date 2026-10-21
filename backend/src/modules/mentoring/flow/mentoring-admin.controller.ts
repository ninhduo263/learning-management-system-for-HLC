import {
    AllowAdminScope,
    AllowSystemRoles,
    Authorization,
    ReqUser,
} from "@common/decorator/auth.decorator";
import { ApiError } from "@config/exception/api-error";
import { MemberType } from "@module/member/common/constant";
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
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBody, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { CreatePairDto } from "./dto/create-pair.dto";
import { EnsureQuarterDto } from "./dto/ensure-quarter.dto";
import { MemberListQueryDto } from "./dto/member-list-query.dto";
import { QuarterLockDto } from "./dto/quarter-lock.dto";
import { ReviewRecapDto } from "./dto/review-recap.dto";
import { ScheduleDto } from "./dto/schedule.dto";
import { UpdateSessionPairDto } from "./dto/update-session-pair.dto";
import { MentoringExcelService } from "./mentoring-excel.service";
import { MentoringFlowService } from "./mentoring-flow.service";

/** Nghiệp vụ mentoring cho Admin tổng hoặc người có quyền MENTORING */
@Controller("mentoring")
@ApiTags("mentoring (admin)")
@Authorization()
@AllowSystemRoles(SystemRole.ADMIN)
@AllowAdminScope(AdminScope.MENTORING)
export class MentoringAdminController {
    constructor(
        private readonly flowService: MentoringFlowService,
        private readonly excelService: MentoringExcelService,
    ) {}

    @Get("quarters")
    listQuarters() {
        return this.flowService.listQuarters();
    }

    @Post("quarters/ensure")
    ensureQuarter(@ReqUser() user: User, @Body() dto: EnsureQuarterDto) {
        return this.flowService.ensureQuarter(dto.code.toUpperCase(), user);
    }

    @Get("quarters/:code/board")
    getBoard(@Param("code") code: string) {
        return this.flowService.getQuarterBoard(code);
    }

    @Put("quarters/:code/lock")
    setLock(
        @ReqUser() user: User,
        @Param("code") code: string,
        @Body() dto: QuarterLockDto,
    ) {
        return this.flowService.setQuarterLock(code, dto.isLocked, user);
    }

    @Post("quarters/:code/pairs")
    createPair(
        @ReqUser() user: User,
        @Param("code") code: string,
        @Body() dto: CreatePairDto,
    ) {
        return this.flowService.createPair(code, dto, user);
    }

    @Post("quarters/:code/import")
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
    importPairs(
        @ReqUser() user: User,
        @Param("code") code: string,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file?.buffer?.length)
            throw ApiError.BadRequest("error-import-file-invalid");
        return this.excelService.importPairs(code, file.buffer, user);
    }

    @Put("sessions/:id/pair")
    updatePair(
        @ReqUser() user: User,
        @Param("id") id: string,
        @Body() dto: UpdateSessionPairDto,
    ) {
        return this.flowService.updateSessionPair(id, dto, user);
    }

    @Delete("sessions/:id")
    deleteSessions(@ReqUser() user: User, @Param("id") id: string) {
        return this.flowService.deleteSessionsFrom(id, user);
    }

    @Put("sessions/:id/schedule/override")
    overrideSchedule(
        @ReqUser() user: User,
        @Param("id") id: string,
        @Body() dto: ScheduleDto,
    ) {
        return this.flowService.overrideSchedule(id, dto, user);
    }

    @Put("recaps/:id/review")
    reviewRecap(
        @ReqUser() user: User,
        @Param("id") id: string,
        @Body() dto: ReviewRecapDto,
    ) {
        return this.flowService.reviewRecap(id, dto, user);
    }

    @Get("reports/quarters")
    getReports() {
        return this.flowService.getQuarterReports();
    }

    @Get("reports/quarters/:code/export.xlsx")
    async exportReport(@Param("code") code: string, @Res() res: Response) {
        const { fileName, buffer } =
            await this.excelService.exportQuarterReport(code);
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

    @Get("members")
    listMembers(@Query() query: MemberListQueryDto) {
        return this.flowService.listMembers({
            type: query.type as MemberType,
            includeInactive: query.includeInactive === "true",
        });
    }
}
