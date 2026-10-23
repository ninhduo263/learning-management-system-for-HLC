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
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { PointAdjustmentStatus } from "../common/constant";
import { AdjustmentDto } from "./dto/adjustment.dto";
import { periodCode } from "./dto/period-code";
import { PeriodSettingsDto } from "./dto/period-settings.dto";
import { ReviewAdjustmentDto } from "./dto/review-adjustment.dto";
import { PointFlowService } from "./point-flow.service";

/** Điểm phụ cấp: Admin tổng hoặc người có quyền POINT */
@Controller("points")
@ApiTags("points (admin)")
@Authorization()
@AllowSystemRoles(SystemRole.ADMIN)
@AllowAdminScope(AdminScope.POINT)
export class PointAdminController {
    constructor(private readonly flowService: PointFlowService) {}

    @Get("periods")
    listPeriods() {
        return this.flowService.listPeriods();
    }

    @Post("periods/:code/ensure")
    ensurePeriod(@Param("code") code: string) {
        return this.flowService.ensurePeriod(periodCode(code));
    }

    @Put("periods/:code/settings")
    updateSettings(
        @Param("code") code: string,
        @Body() dto: PeriodSettingsDto,
    ) {
        return this.flowService.updateSettings(periodCode(code), dto);
    }

    @Post("periods/:code/recalculate")
    recalculate(@ReqUser() user: User, @Param("code") code: string) {
        return this.flowService.recalculate(periodCode(code), user);
    }

    @Post("periods/:code/lock")
    lock(@ReqUser() user: User, @Param("code") code: string) {
        return this.flowService.lock(periodCode(code), user);
    }

    @Post("periods/:code/unlock")
    unlock(@Param("code") code: string) {
        return this.flowService.unlock(periodCode(code));
    }

    @Post("periods/:code/paid")
    markPaid(@Param("code") code: string) {
        return this.flowService.markPaid(periodCode(code));
    }

    /** Dữ liệu báo cáo PDF mùng 10 (FE in ra PDF) */
    @Get("periods/:code/report")
    report(@Param("code") code: string) {
        return this.flowService.report(periodCode(code));
    }

    @Get("periods/:code/group-completion")
    groupCompletion(@Param("code") code: string) {
        return this.flowService.groupCompletion(periodCode(code));
    }

    @Get("periods/:code/summary")
    getSummary(@Param("code") code: string) {
        return this.flowService.getSummary(periodCode(code));
    }

    @Get("periods/:code/members/:memberId")
    getBreakdown(
        @Param("code") code: string,
        @Param("memberId") memberId: string,
    ) {
        return this.flowService.getBreakdown(periodCode(code), memberId);
    }

    @Get("periods/:code/adjustments")
    listAdjustments(
        @Param("code") code: string,
        @Query("status") status?: PointAdjustmentStatus,
    ) {
        return this.flowService.listAdjustments(periodCode(code), status);
    }

    @Post("periods/:code/adjustments")
    createAdjustment(
        @ReqUser() user: User,
        @Param("code") code: string,
        @Body() dto: AdjustmentDto,
    ) {
        return this.flowService.createAdjustment(periodCode(code), dto, user);
    }

    @Put("adjustments/:id/review")
    reviewAdjustment(
        @ReqUser() user: User,
        @Param("id") id: string,
        @Body() dto: ReviewAdjustmentDto,
    ) {
        return this.flowService.reviewAdjustment(
            id,
            dto.status === "APPROVED",
            user,
            dto.note,
            dto.points,
        );
    }

    @Delete("adjustments/:id")
    cancelAdjustment(@ReqUser() user: User, @Param("id") id: string) {
        return this.flowService.cancelAdjustment(id, user);
    }

    @Get("periods/:code/exports")
    listExports(@Param("code") code: string) {
        return this.flowService.listExports(periodCode(code));
    }

    @Get("periods/:code/export.:format")
    async export(
        @ReqUser() user: User,
        @Param("code") code: string,
        @Param("format") format: string,
        @Res() res: Response,
    ) {
        const file = await this.flowService.exportAllowance(
            periodCode(code),
            format === "csv" ? "csv" : "xlsx",
            user,
        );
        res.setHeader("Content-Type", file.contentType);
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${file.fileName}"`,
        );
        res.send(file.buffer);
    }
}
