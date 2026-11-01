import {
    AllowAdminScope,
    AllowSystemRoles,
    Authorization,
    ReqUser,
} from "@common/decorator/auth.decorator";
import { AdminScope } from "@module/permission/common/constant";
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
import { GroupTransferDto } from "./dto/group-transfer.dto";
import { GroupFlowService } from "./group-flow.service";

/**
 * Quản lý nhóm: Admin tổng (mọi nhóm) và Trưởng ban MTE (phạm vi MENTEE: chỉ nhóm MTE).
 * Xóa nhóm chỉ Admin tổng.
 */
@Controller("groups")
@ApiTags("groups")
@Authorization()
@AllowSystemRoles(SystemRole.ADMIN)
@AllowAdminScope(AdminScope.MENTEE)
export class GroupController {
    constructor(private readonly flowService: GroupFlowService) {}

    @Get()
    list(@ReqUser() user: User) {
        return this.flowService.listFor(user);
    }

    @Get("unassigned")
    unassigned() {
        return this.flowService.unassigned();
    }

    @Post()
    async create(@ReqUser() user: User, @Body() dto: GroupDto) {
        await this.flowService.assertManage(user, dto.groupKind);
        return this.flowService.create(dto);
    }

    @Put(":id")
    async update(
        @ReqUser() user: User,
        @Param("id") id: string,
        @Body() dto: GroupDto,
    ) {
        await this.flowService.assertManageGroup(user, id);
        return this.flowService.update(id, dto);
    }

    @Put(":id/role")
    async setRole(
        @ReqUser() user: User,
        @Param("id") id: string,
        @Body() dto: GroupRoleDto,
    ) {
        await this.flowService.assertManageGroup(user, id);
        return this.flowService.setRole(id, dto.role, dto.memberId, user);
    }

    @Post(":id/members")
    async addMembers(
        @ReqUser() user: User,
        @Param("id") id: string,
        @Body() dto: GroupMembersDto,
    ) {
        await this.flowService.assertManageGroup(user, id);
        return this.flowService.addMembers(id, dto.memberIds, user, dto.note);
    }

    @Delete(":id/members/:memberId")
    async removeMember(
        @ReqUser() user: User,
        @Param("id") id: string,
        @Param("memberId") memberId: string,
    ) {
        await this.flowService.assertManageGroup(user, id);
        return this.flowService.removeMember(id, memberId, user);
    }

    /** Thông tin trước khi xóa: số thành viên phải chuyển, dữ liệu liên quan, xóa hẳn hay ngừng hoạt động */
    @Get(":id/delete-preview")
    async deletePreview(@ReqUser() user: User, @Param("id") id: string) {
        await this.flowService.assertManageGroup(user, id);
        return this.flowService.deletePreview(id);
    }

    /** Chuyển hàng loạt thành viên sang nhóm khác cùng loại (bước 1 của xóa nhóm) */
    @Post(":id/transfer")
    async transfer(
        @ReqUser() user: User,
        @Param("id") id: string,
        @Body() dto: GroupTransferDto,
    ) {
        await this.flowService.assertManageGroup(user, id);
        return this.flowService.transferMembers(id, dto, user);
    }

    /** Xóa nhóm đã trống (chỉ Admin toàn cục) */
    @Delete(":id")
    remove(
        @ReqUser() user: User,
        @Param("id") id: string,
        @Body("reason") reason?: string,
    ) {
        return this.flowService.deleteGroup(id, user, reason);
    }

    /** Gán vai trò có thời gian hiệu lực (thay cho "phân quyền" + "gán chức vụ" tách rời) */
    @Post(":id/assignments")
    async assignRole(
        @ReqUser() user: User,
        @Param("id") id: string,
        @Body() dto: AssignRoleDto,
    ) {
        await this.flowService.assertManageGroup(user, id);
        return this.flowService.assignRole(id, dto, user);
    }

    /** Gỡ chức vụ: ghi ngày kết thúc hiệu lực (giữ lịch sử để tính phụ cấp đúng) */
    @Put("assignments/:assignmentId/end")
    async endAssignment(
        @ReqUser() user: User,
        @Param("assignmentId") assignmentId: string,
        @Body("endDate") endDate?: string,
        @Body("reason") reason?: string,
    ) {
        await this.flowService.assertManageAssignment(user, assignmentId);
        return this.flowService.endAssignment(
            assignmentId,
            endDate,
            user,
            reason,
        );
    }

    @Get(":id/history")
    async history(@ReqUser() user: User, @Param("id") id: string) {
        await this.flowService.assertManageGroup(user, id);
        return this.flowService.history(id);
    }
}
