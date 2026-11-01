import {
    AllowSystemRoles,
    Authorization,
    ReqUser,
} from "@common/decorator/auth.decorator";
import { ApiError } from "@config/exception/api-error";
import { MemberModel } from "@module/member/models/member.model";
import { SystemRole } from "@module/user/common/constant";
import { User } from "@module/user/entities/user.entity";
import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { ApiTags } from "@nestjs/swagger";
import { AppealDto } from "./dto/appeal.dto";
import { periodCode } from "./dto/period-code";
import { PointFlowService } from "./point-flow.service";

/** Điểm phụ cấp của chính thành viên đang đăng nhập */
@Controller("points")
@ApiTags("points (mentor, mentee)")
@Authorization()
@AllowSystemRoles(SystemRole.MENTOR, SystemRole.MENTEE)
export class PointMemberController {
    constructor(
        private readonly flowService: PointFlowService,
        @InjectModel(MemberModel)
        private readonly memberModel: typeof MemberModel,
    ) {}

    private async member(user: User) {
        const member = await this.memberModel.findOne({
            where: { userId: user._id },
            raw: true,
        });
        if (!member) throw ApiError.NotFound("error-member-not-linked");
        return member;
    }

    /** ?period=YYYY-MM (mặc định tháng hiện tại) */
    @Get("me")
    async getMine(@ReqUser() user: User, @Query("period") period?: string) {
        return this.flowService.getMine(
            await this.member(user),
            period ? periodCode(period) : undefined,
        );
    }

    @Post("me/periods/:code/appeals")
    async appeal(
        @ReqUser() user: User,
        @Param("code") code: string,
        @Body() dto: AppealDto,
    ) {
        return this.flowService.createAppeal(
            periodCode(code),
            await this.member(user),
            dto,
            user,
        );
    }
}
