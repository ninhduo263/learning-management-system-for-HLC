import {
    AllowSystemRoles,
    Authorization,
    ReqUser,
} from "@common/decorator/auth.decorator";
import { MemberType } from "@module/member/common/constant";
import { SystemRole } from "@module/user/common/constant";
import { User } from "@module/user/entities/user.entity";
import { Body, Controller, Get, Param, Put } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PreferenceDto } from "./dto/preference.dto";
import { RecapDto } from "./dto/recap.dto";
import { ScheduleDto } from "./dto/schedule.dto";
import { MentoringFlowService } from "./mentoring-flow.service";

/** Nghiệp vụ mentoring cho chính mentor / mentee đang đăng nhập */
@Controller("mentoring")
@ApiTags("mentoring (mentor, mentee)")
@Authorization()
@AllowSystemRoles(SystemRole.MENTOR, SystemRole.MENTEE)
export class MentoringMemberController {
    constructor(private readonly flowService: MentoringFlowService) {}

    @Get("me")
    getMine(@ReqUser() user: User) {
        return this.flowService.getMyMentoring(user);
    }

    @Get("me/report")
    getMyReport(@ReqUser() user: User) {
        return this.flowService.getMyReport(user);
    }

    @Put("me/preference")
    savePreference(@ReqUser() user: User, @Body() dto: PreferenceDto) {
        return this.flowService.savePreference(dto, user);
    }

    @Put("sessions/:id/schedule")
    submitSchedule(
        @ReqUser() user: User,
        @Param("id") id: string,
        @Body() dto: ScheduleDto,
    ) {
        return this.flowService.submitSchedule(id, dto, user);
    }

    @Put("sessions/:id/recap")
    submitRecap(
        @ReqUser() user: User,
        @Param("id") id: string,
        @Body() dto: RecapDto,
    ) {
        return this.flowService.submitRecap(id, dto, user);
    }

    /** Danh sách mentor đang hoạt động (để mentee chọn nguyện vọng) */
    @Get("mentors")
    @AllowSystemRoles(SystemRole.ADMIN, SystemRole.MENTOR, SystemRole.MENTEE)
    listMentors() {
        return this.flowService.listMembers({ type: MemberType.MENTOR });
    }
}
