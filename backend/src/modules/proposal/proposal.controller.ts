import {
    AllowSystemRoles,
    Authorization,
    ReqUser,
} from "@common/decorator/auth.decorator";
import { SystemRole } from "@module/user/common/constant";
import { User } from "@module/user/entities/user.entity";
import { Body, Controller, Get, Param, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CreateProposalDto } from "./dto/create-proposal.dto";
import { DecideProposalDto } from "./dto/decide-proposal.dto";
import { ProposalService } from "./proposal.service";

/** Đề xuất giữa các chức vụ. Quyền gửi / duyệt do service kiểm tra theo chức vụ của người gọi */
@Controller("proposals")
@ApiTags("proposals")
@Authorization()
@AllowSystemRoles(SystemRole.ADMIN, SystemRole.MENTOR, SystemRole.MENTEE)
export class ProposalController {
    constructor(private readonly proposalService: ProposalService) {}

    /** Tôi được gửi / duyệt loại đề xuất nào, bao nhiêu đề xuất đang chờ tôi */
    @Get("summary")
    summary(@ReqUser() user: User) {
        return this.proposalService.summary(user);
    }

    /** ?box=mine|inbox|all&status=PENDING&type= */
    @Get()
    list(
        @ReqUser() user: User,
        @Query("box") box?: string,
        @Query("status") status?: string,
        @Query("type") type?: string,
    ) {
        return this.proposalService.list(user, { box, status, type });
    }

    @Get(":id")
    get(@ReqUser() user: User, @Param("id") id: string) {
        return this.proposalService.get(user, id);
    }

    @Post()
    create(@ReqUser() user: User, @Body() dto: CreateProposalDto) {
        return this.proposalService.create(user, dto);
    }

    @Put(":id/decide")
    decide(
        @ReqUser() user: User,
        @Param("id") id: string,
        @Body() dto: DecideProposalDto,
    ) {
        return this.proposalService.decide(user, id, dto);
    }

    @Put(":id/cancel")
    cancel(@ReqUser() user: User, @Param("id") id: string) {
        return this.proposalService.cancel(user, id);
    }
}
