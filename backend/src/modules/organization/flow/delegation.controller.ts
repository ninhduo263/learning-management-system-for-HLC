import { Authorization, ReqUser } from "@common/decorator/auth.decorator";
import { User } from "@module/user/entities/user.entity";
import { Body, Controller, Get, Param, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { DelegationService } from "./delegation.service";
import { DelegationDto } from "./dto/delegation.dto";

/** Ủy quyền tạm thời trong nhóm (Leader giao cho Phó nhóm khi vắng...) */
@Controller("delegations")
@ApiTags("delegations")
@Authorization()
export class DelegationController {
    constructor(private readonly delegationService: DelegationService) {}

    @Get()
    list(@ReqUser() user: User, @Query("groupId") groupId?: string) {
        return this.delegationService.list(user, groupId);
    }

    @Post()
    create(@ReqUser() user: User, @Body() dto: DelegationDto) {
        return this.delegationService.create(user, dto);
    }

    @Put(":id/revoke")
    revoke(@ReqUser() user: User, @Param("id") id: string) {
        return this.delegationService.revoke(user, id);
    }
}
