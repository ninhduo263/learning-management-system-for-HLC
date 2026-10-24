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
import { LearningAverageService } from "./learning-average.service";

@Controller("dashboard")
@ApiTags("dashboard")
@Authorization()
export class DashboardController {
    constructor(
        private readonly dashboardService: DashboardService,
        private readonly learningAverage: LearningAverageService,
    ) {}

    /**
     * Dashboard điểm học tập trung bình (học tập + recap mentoring): Admin toàn cục, Trưởng ban Học tập (mọi module)
     * và Admin module nhỏ (chỉ module mình). Quyền do service kiểm tra.
     * ?period=YYYY-MM | ?quarter=2026Q4 &groupId= &moduleId= &memberType=MENTEE|MENTOR
     */
    @Get("learning-average")
    @AllowSystemRoles(SystemRole.ADMIN, SystemRole.MENTOR, SystemRole.MENTEE)
    average(
        @ReqUser() user: User,
        @Query("period") period?: string,
        @Query("quarter") quarter?: string,
        @Query("groupId") groupId?: string,
        @Query("moduleId") moduleId?: string,
        @Query("memberType") memberType?: string,
    ) {
        return this.learningAverage.average(user, {
            period,
            quarter,
            groupId,
            moduleId,
            memberType,
        });
    }

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
