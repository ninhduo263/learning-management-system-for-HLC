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
import { ContributorDto } from "./dto/contributor.dto";
import { ExpenseDto } from "./dto/expense.dto";
import { ProxyContributionDto } from "./dto/proxy-contribution.dto";
import { GroupKind } from "@module/organization/common/constant";
import { PayerKind } from "./fund-flow.service";
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

    /** Báo cáo theo nhóm, theo tuần (Admin/quyền FUND: mọi nhóm; Leader/Phó: nhóm mình) */
    @Get("groups/report")
    @AllowSystemRoles(SystemRole.ADMIN, SystemRole.MENTOR, SystemRole.MENTEE)
    groupReport(
        @ReqUser() user: User,
        @Query("period") period?: string,
        @Query("groupId") groupId?: string,
        @Query("kind") kind?: GroupKind,
    ) {
        return this.flowService.groupReport(user, { period, groupId, kind });
    }

    /** Leader nhóm / Admin HLC Fund nộp minh chứng hộ thành viên hoặc thầy cô ngoài danh sách */
    @Post("groups/contributions")
    @AllowSystemRoles(SystemRole.ADMIN, SystemRole.MENTOR, SystemRole.MENTEE)
    proxySubmit(@ReqUser() user: User, @Body() dto: ProxyContributionDto) {
        return this.flowService.proxySubmit(user, dto);
    }

    /** Thầy cô ngoài danh sách MTO (Admin HLC Fund: tất cả; Leader: nhóm mình) */
    @Get("contributors")
    @AllowSystemRoles(SystemRole.ADMIN, SystemRole.MENTOR, SystemRole.MENTEE)
    listContributors(
        @ReqUser() user: User,
        @Query("groupId") groupId?: string,
    ) {
        return this.flowService.listContributors(user, groupId);
    }

    @Post("contributors")
    @AllowSystemRoles(SystemRole.ADMIN, SystemRole.MENTOR, SystemRole.MENTEE)
    createContributor(@ReqUser() user: User, @Body() dto: ContributorDto) {
        return this.flowService.saveContributor(user, dto);
    }

    @Put("contributors/:id")
    @AllowSystemRoles(SystemRole.ADMIN, SystemRole.MENTOR, SystemRole.MENTEE)
    updateContributor(
        @ReqUser() user: User,
        @Param("id") id: string,
        @Body() dto: ContributorDto,
    ) {
        return this.flowService.saveContributor(user, dto, id);
    }

    /** Sổ thu chi: ?year=2026&quarter=4&kind=MTO|MTE|EXTERNAL */
    @Get("ledger")
    @AllowSystemRoles(SystemRole.ADMIN)
    @AllowAdminScope(AdminScope.FUND)
    ledger(
        @Query("year") year?: string,
        @Query("quarter") quarter?: string,
        @Query("kind") kind?: PayerKind,
    ) {
        return this.flowService.ledger({
            year: year ? Number(year) : undefined,
            quarter: quarter ? Number(quarter) : undefined,
            kind,
        });
    }

    @Post("expenses")
    @AllowSystemRoles(SystemRole.ADMIN)
    @AllowAdminScope(AdminScope.FUND)
    createExpense(@ReqUser() user: User, @Body() dto: ExpenseDto) {
        return this.flowService.saveExpense(user, dto);
    }

    @Put("expenses/:id")
    @AllowSystemRoles(SystemRole.ADMIN)
    @AllowAdminScope(AdminScope.FUND)
    updateExpense(
        @ReqUser() user: User,
        @Param("id") id: string,
        @Body() dto: ExpenseDto,
    ) {
        return this.flowService.saveExpense(user, dto, id);
    }

    @Delete("expenses/:id")
    @AllowSystemRoles(SystemRole.ADMIN)
    @AllowAdminScope(AdminScope.FUND)
    removeExpense(@Param("id") id: string) {
        return this.flowService.removeExpense(id);
    }

    /** Leader duyệt minh chứng của nhóm: Đã xong / Chưa xong */
    @Put("groups/review")
    @AllowSystemRoles(SystemRole.ADMIN, SystemRole.MENTOR, SystemRole.MENTEE)
    groupReview(@ReqUser() user: User, @Body() dto: BulkReviewContributionDto) {
        return this.flowService.review(dto.ids, dto.status, user, dto.note);
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
        @Query("contributorId") contributorId?: string,
    ) {
        return this.flowService.list({
            period,
            date,
            status,
            memberId,
            contributorId,
        });
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
