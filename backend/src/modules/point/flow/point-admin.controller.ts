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
import { UnlockPeriodDto } from "./dto/unlock-period.dto";
import { CarryOverDto } from "./dto/carry-over.dto";
import { ReviewAdjustmentDto } from "./dto/review-adjustment.dto";
import { PointFlowService } from "./point-flow.service";
import { ApiError } from "@config/exception/api-error";
import { RolePermission } from "@module/organization/common/constant";
import { GroupAccessService } from "@module/organization/flow/group-access.service";

/** Điểm phụ cấp: Admin tổng hoặc người có quyền POINT */
@Controller("points")
@ApiTags("points (admin)")
@Authorization()
@AllowSystemRoles(SystemRole.ADMIN)
@AllowAdminScope(AdminScope.POINT)
export class PointAdminController {
    constructor(
        private readonly flowService: PointFlowService,
        private readonly access: GroupAccessService,
    ) {}

    /** Kế toán (chỉ VIEW_PAYOUT): chỉ xuất bảng đã chốt */
    private async assertExport(user: User, code: string) {
        const { actions } = await this.access.capabilities(user);
        if (
            actions.has(RolePermission.EDIT_POINTS) ||
            actions.has(RolePermission.LOCK_PERIOD)
        )
            return;
        const period = await this.flowService.getPeriodView(code);
        if (!period.isLocked)
            throw ApiError.Forbidden("error-action-forbidden");
    }

    @Get("periods")
    listPeriods() {
        return this.flowService.listPeriods();
    }

    @Post("periods/:code/ensure")
    ensurePeriod(@Param("code") code: string) {
        return this.flowService.ensurePeriod(periodCode(code));
    }

    @Put("periods/:code/settings")
    async updateSettings(
        @ReqUser() user: User,
        @Param("code") code: string,
        @Body() dto: PeriodSettingsDto,
    ) {
        await this.access.assertCan(user, RolePermission.EDIT_POINTS);
        return this.flowService.updateSettings(periodCode(code), dto, user);
    }

    @Post("periods/:code/recalculate")
    async recalculate(@ReqUser() user: User, @Param("code") code: string) {
        await this.access.assertCan(user, RolePermission.EDIT_POINTS);
        return this.flowService.recalculate(periodCode(code), user);
    }

    @Post("periods/:code/lock")
    async lock(@ReqUser() user: User, @Param("code") code: string) {
        await this.access.assertCan(user, RolePermission.LOCK_PERIOD);
        return this.flowService.lock(periodCode(code), user);
    }

    @Post("periods/:code/unlock")
    async unlock(
        @ReqUser() user: User,
        @Param("code") code: string,
        @Body() dto: UnlockPeriodDto,
    ) {
        this.access.assertSuperAdmin(user);
        return this.flowService.unlock(periodCode(code), user, dto.reason);
    }

    @Post("periods/:code/paid")
    async markPaid(@ReqUser() user: User, @Param("code") code: string) {
        await this.access.assertCan(user, RolePermission.LOCK_PERIOD);
        return this.flowService.markPaid(periodCode(code), user);
    }

    /** Dữ liệu báo cáo PDF mùng 10 (FE in ra PDF) */
    /** Nhật ký kỳ: sửa đơn giá, chốt, mở khóa, chi trả, bù chênh lệch */
    @Get("periods/:code/logs")
    logs(@Param("code") code: string) {
        return this.flowService.logs(periodCode(code));
    }

    /** Bù chênh lệch cho kỳ đã chốt/đã chi: ghi dòng điều chỉnh ở kỳ kế tiếp */
    @Post("periods/:code/carry-over")
    async carryOver(
        @ReqUser() user: User,
        @Param("code") code: string,
        @Body() dto: CarryOverDto,
    ) {
        await this.access.assertCan(user, RolePermission.EDIT_POINTS);
        return this.flowService.carryOver(periodCode(code), dto, user);
    }

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
    async createAdjustment(
        @ReqUser() user: User,
        @Param("code") code: string,
        @Body() dto: AdjustmentDto,
    ) {
        await this.access.assertCan(user, RolePermission.EDIT_POINTS);
        return this.flowService.createAdjustment(periodCode(code), dto, user);
    }

    @Put("adjustments/:id/review")
    async reviewAdjustment(
        @ReqUser() user: User,
        @Param("id") id: string,
        @Body() dto: ReviewAdjustmentDto,
    ) {
        await this.access.assertCan(user, RolePermission.EDIT_POINTS);
        return this.flowService.reviewAdjustment(
            id,
            dto.status === "APPROVED",
            user,
            dto.note,
            dto.points,
        );
    }

    @Delete("adjustments/:id")
    async cancelAdjustment(@ReqUser() user: User, @Param("id") id: string) {
        await this.access.assertCan(user, RolePermission.EDIT_POINTS);
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
        await this.assertExport(user, periodCode(code));
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
