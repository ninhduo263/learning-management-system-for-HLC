import { BaseService } from "@config/service/base.service";
import { Entity } from "@module/repository";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { InjectTransaction } from "@module/repository/common/transaction";
import { Injectable } from "@nestjs/common";
import { Department } from "../entities/department.entity";
import { DepartmentRepository } from "../repositories/department-repository.interface";

@Injectable()
export class DepartmentService extends BaseService<
    Department,
    DepartmentRepository
> {
    constructor(
        @InjectRepository(Entity.DEPARTMENT)
        private readonly departmentRepository: DepartmentRepository,
        @InjectTransaction()
        private readonly departmentTransaction: BaseTransaction,
    ) {
        super(departmentRepository, {
            notFoundCode: "error-record-not-found",
            transaction: departmentTransaction,
        });
    }
}
