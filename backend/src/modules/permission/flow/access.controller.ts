import {
    AllowSystemRoles,
    Authorization,
    ReqUser,
} from "@common/decorator/auth.decorator";
import { ApiError } from "@config/exception/api-error";
import { LearningModuleModel } from "@module/learning/models/learning-module.model";
import { MemberModel } from "@module/member/models/member.model";
import { UserModel } from "@module/repository/sequelize/model/user.model";
import { SystemRole } from "@module/user/common/constant";
import { User } from "@module/user/entities/user.entity";
import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { ApiTags } from "@nestjs/swagger";
import { Op } from "sequelize";
import { AdminScope } from "../common/constant";
import { AdminPermissionModel } from "../models/admin-permission.model";
import { SecurityConfigService } from "@module/setting/security-config.service";
import { GroupAccessService } from "@module/organization/flow/group-access.service";
import { GrantPermissionDto } from "./grant-permission.dto";

/** Quyền quản trị theo phạm vi (mentee/mentor được giao duyệt quỹ, quản lý module, ...) */
@Controller("access")
@ApiTags("access")
@Authorization()
export class AccessController {
    constructor(
        @InjectModel(AdminPermissionModel)
        private readonly permissionModel: typeof AdminPermissionModel,
        @InjectModel(UserModel) private readonly userModel: typeof UserModel,
        @InjectModel(MemberModel)
        private readonly memberModel: typeof MemberModel,
        @InjectModel(LearningModuleModel)
        private readonly moduleModel: typeof LearningModuleModel,
        private readonly groupAccess: GroupAccessService,
        private readonly securityConfig: SecurityConfigService,
    ) {}

    /** Quyền của người đang đăng nhập: FE dùng để hiện menu */
    @Get("me")
    async getMine(@ReqUser() user: User) {
        const isSuperAdmin = user.systemRole === SystemRole.ADMIN;
        const capabilities = await this.groupAccess.capabilities(user);
        const config = await this.securityConfig.get();
        return {
            systemRole: user.systemRole,
            isSuperAdmin,
            scopes: [...capabilities.scopes],
            /** Phạm vi có quyền GHI (scopes gồm cả phạm vi chỉ xem): FE dùng để ẩn nút sửa của người chỉ được xem */
            writeScopes: [...capabilities.writeScopes],
            /** Hành động cấp hệ thống: chốt kỳ, sửa điểm, xem bảng chi trả, xuất dữ liệu cá nhân, xem nhật ký */
            actions: [...capabilities.actions],
            /** null = mọi module (Admin tổng, Trưởng ban học tập / MTE); Admin module nhỏ: các module được giao */
            moduleIds: isSuperAdmin ? null : capabilities.moduleIds,
            /** Nhóm có quyền (vai trò trong nhóm, vai trò cấp ban, ủy quyền): menu "Nhóm của tôi" */
            leaderGroups: await this.leaderGroupsOf(user),
            /** Công tắc "bắt buộc đổi mật khẩu lần đầu" đang bật và tài khoản chưa tự đổi lần nào */
            mustChangePassword:
                !isSuperAdmin &&
                config.forcePasswordChangeOnFirstLogin &&
                !user.passwordChangedAt,
            profileUrlEditable: config.memberCanEditProfileUrl,
        };
    }

    /** Quyền quản trị có từ vai trò đang giữ (ví dụ vai trò "Admin HLC Fund") */
    private async roleScopesOf(user: User) {
        const member = await this.groupAccess.memberOfUser(user);
        return member ? this.groupAccess.adminScopesOf(member._id) : [];
    }

    private async leaderGroupsOf(user: User) {
        const member = await this.groupAccess.memberOfUser(user);
        return member ? this.groupAccess.leadershipOf(member._id) : [];
    }

    @Get("permissions")
    @AllowSystemRoles(SystemRole.ADMIN)
    async list() {
        const rows = await this.permissionModel.findAll({
            order: [["createdAt", "DESC"]],
            raw: true,
        });
        const userIds = [...new Set(rows.map((row) => row.userId))];
        const users = new Map(
            (
                await this.userModel.findAll({
                    where: { _id: userIds },
                    attributes: ["_id", "username", "fullname", "systemRole"],
                    raw: true,
                })
            ).map((item) => [item._id, item]),
        );
        const members = new Map(
            (
                await this.memberModel.findAll({
                    where: { userId: userIds },
                    raw: true,
                })
            ).map((item) => [item.userId, item]),
        );
        const modules = new Map(
            (
                await this.moduleModel.findAll({
                    attributes: ["_id", "code", "name"],
                    raw: true,
                })
            ).map((item) => [item._id, item]),
        );
        return rows.map((row) => ({
            ...row,
            user: users.get(row.userId) ?? null,
            member: members.get(row.userId)
                ? {
                      _id: members.get(row.userId)._id,
                      memberCode: members.get(row.userId).memberCode,
                      fullName: members.get(row.userId).fullName,
                  }
                : null,
            module:
                row.moduleId && modules.get(row.moduleId)
                    ? modules.get(row.moduleId)
                    : null,
        }));
    }

    @Post("permissions")
    @AllowSystemRoles(SystemRole.ADMIN)
    async grant(@ReqUser() admin: User, @Body() dto: GrantPermissionDto) {
        const account = dto.account.trim();
        const member = await this.memberModel.findOne({
            where: { memberCode: account.toUpperCase() },
            raw: true,
        });
        const target = await this.userModel.findOne({
            where: member?.userId
                ? { _id: member.userId }
                : { username: { [Op.iLike]: account } },
            raw: true,
        });
        if (!target) throw ApiError.NotFound("error-user-not-found");
        if (dto.scope === AdminScope.LEARNING_MODULE) {
            if (
                !dto.moduleId ||
                !(await this.moduleModel.findByPk(dto.moduleId))
            )
                throw ApiError.NotFound("error-learning-module-not-found");
        }
        const where = {
            userId: target._id,
            scope: dto.scope,
            moduleId:
                dto.scope === AdminScope.LEARNING_MODULE ? dto.moduleId : null,
        };
        const [row] = await this.permissionModel.findOrCreate({
            where,
            defaults: {
                ...where,
                grantedBy: admin._id,
                note: dto.note ?? null,
            },
        });
        return row.get({ plain: true });
    }

    @Delete("permissions/:id")
    @AllowSystemRoles(SystemRole.ADMIN)
    async revoke(@Param("id") id: string) {
        const deleted = await this.permissionModel.destroy({
            where: { _id: id },
        });
        if (!deleted) throw ApiError.NotFound("error-record-not-found");
        return { deleted: true };
    }
}
