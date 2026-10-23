import {
    AllowSystemRoles,
    Authorization,
    ReqUser,
} from "@common/decorator/auth.decorator";
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
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { GroupMembersDto } from "./dto/group-members.dto";
import { AssignRoleDto } from "./dto/assign-role.dto";
import { GroupRoleDto } from "./dto/group-role.dto";
import { GroupDto } from "./dto/group.dto";
import { GroupFlowService } from "./group-flow.service";

/** Quản lý nhóm (Admin tổng) */
@Controller("groups")
@ApiTags("groups")
@Authorization()
@AllowSystemRoles(SystemRole.ADMIN)
export class GroupController {
    constructor(private readonly flowService: GroupFlowService) {}

    @Get()
    list() {
        return this.flowService.list();
    }

    @Get("unassigned")
    unassigned() {
        return this.flowService.unassigned();
    }

    @Post()
    create(@Body() dto: GroupDto) {
        return this.flowService.create(dto);
    }

    @Put(":id")
    update(@Param("id") id: string, @Body() dto: GroupDto) {
        return this.flowService.update(id, dto);
    }

    @Put(":id/role")
    setRole(
        @ReqUser() user: User,
        @Param("id") id: string,
        @Body() dto: GroupRoleDto,
    ) {
        return this.flowService.setRole(id, dto.role, dto.memberId, user);
    }

    @Post(":id/members")
    addMembers(
        @ReqUser() user: User,
        @Param("id") id: string,
        @Body() dto: GroupMembersDto,
    ) {
        return this.flowService.addMembers(id, dto.memberIds, user, dto.note);
    }

    @Delete(":id/members/:memberId")
    removeMember(@Param("id") id: string, @Param("memberId") memberId: string) {
        return this.flowService.removeMember(id, memberId);
    }

    /** Gán vai trò có thời gian hiệu lực (thay cho "phân quyền" + "gán chức vụ" tách rời) */
    @Post(":id/assignments")
    assignRole(
        @ReqUser() user: User,
        @Param("id") id: string,
        @Body() dto: AssignRoleDto,
    ) {
        return this.flowService.assignRole(id, dto, user);
    }

    @Put("assignments/:assignmentId/end")
    endAssignment(
        @Param("assignmentId") assignmentId: string,
        @Body("endDate") endDate?: string,
    ) {
        return this.flowService.endAssignment(assignmentId, endDate);
    }

    @Get(":id/history")
    history(@Param("id") id: string) {
        return this.flowService.history(id);
    }
}
