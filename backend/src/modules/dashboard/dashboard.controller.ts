import {
    AllowSystemRoles,
    Authorization,
    ReqUser,
} from "@common/decorator/auth.decorator";
import { SystemRole } from "@module/user/common/constant";
import { User } from "@module/user/entities/user.entity";
import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { DashboardService } from "./dashboard.service";

@Controller("dashboard")
@ApiTags("dashboard")
@Authorization()
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) {}

    /** Dashboard tháng cho admin: ?period=YYYY-MM */
    @Get("admin")
    @AllowSystemRoles(SystemRole.ADMIN)
    admin(@Query("period") period?: string) {
        return this.dashboardService.admin(period);
    }

    /** Dashboard cá nhân mentor/mentee */
    @Get("me")
    @AllowSystemRoles(SystemRole.MENTOR, SystemRole.MENTEE)
    me(@ReqUser() user: User, @Query("period") period?: string) {
        return this.dashboardService.me(user, period);
    }
}
