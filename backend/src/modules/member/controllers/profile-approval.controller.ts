import {
    AllowSystemRoles,
    Authorization,
    ReqUser,
} from "@common/decorator/auth.decorator";
import { SystemRole } from "@module/user/common/constant";
import { User } from "@module/user/entities/user.entity";
import { Body, Controller, Get, Param, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ProfileApprovalService } from "../services/profile-approval.service";

/** Duyệt thay đổi hồ sơ nhạy cảm (Admin toàn cục hoặc người được ủy quyền) */
@Controller("profile-requests")
@ApiTags("member")
@Authorization()
export class ProfileApprovalController {
    constructor(private readonly approval: ProfileApprovalService) {}

    /** ?status=PENDING|APPROVED|REJECTED|CANCELLED|ALL */
    @Get()
    list(@ReqUser() user: User, @Query("status") status?: string) {
        return this.approval.list(user, status || "PENDING");
    }

    /** Có quyền duyệt không (FE hiện menu) */
    @Get("can-approve")
    async canApprove(@ReqUser() user: User) {
        const scope = await this.approval.approverScope(user);
        return {
            canApprove: Boolean(scope),
            scopes: scope ? [...scope.scopes] : [],
        };
    }

    @Put(":id/decide")
    decide(
        @ReqUser() user: User,
        @Param("id") id: string,
        @Body("approve") approve: boolean,
        @Body("reason") reason?: string,
    ) {
        return this.approval.decide(user, id, approve === true, reason);
    }

    @Get("approvers/all")
    @AllowSystemRoles(SystemRole.ADMIN)
    approvers() {
        return this.approval.listApprovers();
    }

    @Post("approvers")
    @AllowSystemRoles(SystemRole.ADMIN)
    addApprover(
        @ReqUser() user: User,
        @Body()
        dto: {
            memberId: string;
            scope: string;
            startDate: string;
            endDate: string;
            note?: string;
        },
    ) {
        return this.approval.addApprover(user, dto);
    }

    @Put("approvers/:id/revoke")
    @AllowSystemRoles(SystemRole.ADMIN)
    revoke(@ReqUser() user: User, @Param("id") id: string) {
        return this.approval.revokeApprover(user, id);
    }
}
