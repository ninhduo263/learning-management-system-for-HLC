import { BaseService } from "@config/service/base.service";
import { Entity } from "@module/repository";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { InjectTransaction } from "@module/repository/common/transaction";
import { Injectable } from "@nestjs/common";
import { ModuleAssignment } from "../entities/module-assignment.entity";
import { ModuleAssignmentRepository } from "../repositories/module-assignment-repository.interface";

@Injectable()
export class ModuleAssignmentService extends BaseService<
    ModuleAssignment,
    ModuleAssignmentRepository
> {
    constructor(
        @InjectRepository(Entity.MODULE_ASSIGNMENT)
        private readonly moduleAssignmentRepository: ModuleAssignmentRepository,
        @InjectTransaction()
        private readonly moduleAssignmentTransaction: BaseTransaction,
    ) {
        super(moduleAssignmentRepository, {
            notFoundCode: "error-record-not-found",
            transaction: moduleAssignmentTransaction,
        });
    }
}
