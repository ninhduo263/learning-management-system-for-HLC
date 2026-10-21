import { BaseService } from "@config/service/base.service";
import { Entity } from "@module/repository";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { InjectTransaction } from "@module/repository/common/transaction";
import { AdminScopeChecker } from "@common/interface/admin-scope-checker.interface";
import { Injectable } from "@nestjs/common";
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
    ) {
        super(adminPermissionRepository, {
            notFoundCode: "error-record-not-found",
            transaction: adminPermissionTransaction,
        });
    }

    /** Có ít nhất 1 quyền thuộc phạm vi này (với LEARNING_MODULE: bất kỳ module nào) */
    hasScope(userId: string, scope: string): Promise<boolean> {
        return this.adminPermissionRepository.exists({
            userId,
            scope: scope as AdminScope,
        });
    }
}
