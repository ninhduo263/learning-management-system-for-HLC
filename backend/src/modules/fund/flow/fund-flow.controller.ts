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
import { FundContributionStatus } from "../common/constant";
import { ContributionDto } from "./dto/contribution.dto";
import { BulkReviewContributionDto } from "./dto/bulk-review-contribution.dto";
import { ReviewContributionDto } from "./dto/review-contribution.dto";
import { FundFlowService } from "./fund-flow.service";

/** HLC Fund: thành viên nộp minh chứng, ban HLC Fund duyệt */
@Controller("fund")
@ApiTags("fund")
@Authorization()
export class FundFlowController {
    constructor(private readonly flowService: FundFlowService) {}

    @Get("me")
    @AllowSystemRoles(SystemRole.MENTOR, SystemRole.MENTEE)
    getMine(@ReqUser() user: User, @Query("period") period?: string) {
        return this.flowService.getMine(user, period);
    }

    @Post("me/contributions")
    @AllowSystemRoles(SystemRole.MENTOR, SystemRole.MENTEE)
    submit(@ReqUser() user: User, @Body() dto: ContributionDto) {
        return this.flowService.submit(user, dto);
    }

    /** Sửa minh chứng chưa duyệt / bị từ chối (gửi lại) */
    @Put("me/contributions/:id")
    @AllowSystemRoles(SystemRole.MENTOR, SystemRole.MENTEE)
    update(
        @ReqUser() user: User,
        @Param("id") id: string,
        @Body() dto: ContributionDto,
    ) {
        return this.flowService.submit(user, dto, id);
    }

    @Delete("me/contributions/:id")
    @AllowSystemRoles(SystemRole.MENTOR, SystemRole.MENTEE)
    remove(@ReqUser() user: User, @Param("id") id: string) {
        return this.flowService.remove(user, id);
    }

    /** ?period=YYYY-MM&date=YYYY-MM-DD&status=PENDING */
    @Get("contributions")
    @AllowSystemRoles(SystemRole.ADMIN)
    @AllowAdminScope(AdminScope.FUND)
    list(
        @Query("period") period?: string,
        @Query("date") date?: string,
        @Query("status") status?: FundContributionStatus,
        @Query("memberId") memberId?: string,
    ) {
        return this.flowService.list({ period, date, status, memberId });
    }

    @Put("contributions/:id/review")
    @AllowSystemRoles(SystemRole.ADMIN)
    @AllowAdminScope(AdminScope.FUND)
    review(
        @ReqUser() user: User,
        @Param("id") id: string,
        @Body() dto: ReviewContributionDto,
    ) {
        return this.flowService.review([id], dto.status, user, dto.note);
    }

    @Put("contributions/review")
    @AllowSystemRoles(SystemRole.ADMIN)
    @AllowAdminScope(AdminScope.FUND)
    bulkReview(@ReqUser() user: User, @Body() dto: BulkReviewContributionDto) {
        return this.flowService.review(dto.ids, dto.status, user, dto.note);
    }

    @Get("stats/:code")
    @AllowSystemRoles(SystemRole.ADMIN)
    @AllowAdminScope(AdminScope.FUND)
    stats(@Param("code") code: string) {
        return this.flowService.stats(code);
    }
}
