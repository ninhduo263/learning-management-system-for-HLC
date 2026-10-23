import { BaseService } from "@config/service/base.service";
import { Entity } from "@module/repository";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { InjectTransaction } from "@module/repository/common/transaction";
import { AdminScopeChecker } from "@common/interface/admin-scope-checker.interface";
import { Injectable } from "@nestjs/common";
import { GroupAccessService } from "@module/organization/flow/group-access.service";
import { AdminScope } from "../common/constant";
import { AdminPermission } from "../entities/admin-permission.entity";
import { AdminPermissionRepository } from "../repositories/admin-permission-repository.interface";

@Injectable()
export class AdminPermissionService
    extends BaseService<AdminPermission, AdminPermissionRepository>
    implements AdminScopeChecker
{
    constructor(
        @InjectRepository(Entity.ADMIN_PERMISSION)
        private readonly adminPermissionRepository: AdminPermissionRepository,
        @InjectTransaction()
        private readonly adminPermissionTransaction: BaseTransaction,
        private readonly groupAccess: GroupAccessService,
    ) {
        super(adminPermissionRepository, {
            notFoundCode: "error-record-not-found",
            transaction: adminPermissionTransaction,
        });
    }

    /**
     * Có quyền thuộc phạm vi này: được cấp trực tiếp (bảng admin-permission, ví dụ quyền theo module học tập)
     * hoặc đang giữ vai trò có quyền quản trị tương ứng (Position.adminScope, ví dụ "Admin HLC Fund").
     */
    async hasScope(userId: string, scope: string): Promise<boolean> {
        if (
            await this.adminPermissionRepository.exists({
                userId,
                scope: scope as AdminScope,
            })
        )
            return true;
        const member = await this.groupAccess.memberOfUser({ _id: userId });
        return member
            ? (await this.groupAccess.adminScopesOf(member._id)).includes(scope)
            : false;
    }
}
