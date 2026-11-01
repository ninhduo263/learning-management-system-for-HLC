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
     * Có quyền thuộc phạm vi này: được cấp trực tiếp (bảng admin-permission), từ vai trò đang giữ
     * (Position.adminScope), phạm vi bao hàm (Trưởng ban MTE gồm điểm phụ cấp và học tập), hoặc
     * hành động cấp hệ thống (chốt kỳ, sửa điểm, xem bảng chi trả -> vào được màn hình điểm phụ cấp).
     */
    async hasScope(
        userId: string,
        scope: string,
        write = false,
    ): Promise<boolean> {
        // Phạm vi cấp trực tiếp (bảng admin-permission) có đủ quyền xem và ghi
        if (
            await this.adminPermissionRepository.exists({
                userId,
                scope: scope as AdminScope,
            })
        )
            return true;
        const capabilities = await this.groupAccess.capabilities({
            _id: userId,
            systemRole: undefined,
        });
        // Request đổi dữ liệu: chỉ tính phạm vi có quyền GHI (phạm vi chỉ xem như POINT của Trưởng ban MTE thì không)
        return (write ? capabilities.writeScopes : capabilities.scopes).has(
            scope,
        );
    }
}
