import { Authorization, ReqUser } from "@common/decorator/auth.decorator";
import { GroupAccessService } from "@module/organization/flow/group-access.service";
import { RolePermission } from "@module/organization/common/constant";
import { User } from "@module/user/entities/user.entity";
import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ActivityLogService } from "./activity-log.service";

/** Nhật ký thao tác: Admin toàn cục và người được giao quyền xem nhật ký */
@Controller("activity-logs")
@ApiTags("activity-logs")
@Authorization()
export class ActivityLogController {
    constructor(
        private readonly logService: ActivityLogService,
        private readonly groupAccess: GroupAccessService,
    ) {}

    @Get()
    async list(
        @ReqUser() user: User,
        @Query("module") module?: string,
        @Query("action") action?: string,
        @Query("targetId") targetId?: string,
        @Query("from") from?: string,
        @Query("to") to?: string,
        @Query("keyword") keyword?: string,
        @Query("limit") limit?: string,
    ) {
        await this.groupAccess.assertCan(
            user,
            RolePermission.VIEW_ACTIVITY_LOG,
        );
        return this.logService.list(
            { module, action, targetId, from, to, keyword },
            Number(limit) || 300,
        );
    }
}
