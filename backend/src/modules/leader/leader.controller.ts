import {
    AllowSystemRoles,
    Authorization,
    ReqUser,
} from "@common/decorator/auth.decorator";
import { ScoreRecapDto } from "@module/mentoring/flow/dto/score-recap.dto";
import { RecapScoreService } from "@module/mentoring/flow/recap-score.service";
import { SystemRole } from "@module/user/common/constant";
import { User } from "@module/user/entities/user.entity";
import { Body, Controller, Get, Param, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { LeaderService } from "./leader.service";

/**
 * Leader / Phó nhóm (và Admin): tiến độ nhóm, chấm recap thang 100.
 * Quyền kiểm tra theo nhóm trong service; mentee thường nhận 403.
 */
@Controller("leader")
@ApiTags("leader")
@Authorization()
@AllowSystemRoles(SystemRole.ADMIN, SystemRole.MENTOR, SystemRole.MENTEE)
export class LeaderController {
    constructor(
        private readonly leaderService: LeaderService,
        private readonly recapScoreService: RecapScoreService,
    ) {}

    /** ?period=YYYY-MM */
    @Get("overview")
    overview(@ReqUser() user: User, @Query("period") period?: string) {
        return this.leaderService.overview(user, period);
    }

    /** Recap cần chấm: ?period=&groupId=&filter=UNSCORED|SCORED|ALL */
    @Get("recaps")
    recaps(
        @ReqUser() user: User,
        @Query("period") period?: string,
        @Query("groupId") groupId?: string,
        @Query("filter") filter?: string,
    ) {
        return this.recapScoreService.list(user, { period, groupId, filter });
    }

    @Get("recap-rubric")
    rubric() {
        return this.recapScoreService.rubric();
    }

    @Put("recaps/:id/score")
    score(
        @ReqUser() user: User,
        @Param("id") id: string,
        @Body() dto: ScoreRecapDto,
    ) {
        return this.recapScoreService.score(user, id, dto);
    }
}
