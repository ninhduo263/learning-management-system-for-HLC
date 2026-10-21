import { BaseControllerFactory } from "@config/controller/base-controller-factory";
import { CrudControllerConfig } from "@config/controller/crud-controller-config";
import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { DepartmentConditionDto } from "../dto/department-condition.dto";
import { CreateDepartmentDto } from "../dto/create-department.dto";
import { UpdateDepartmentDto } from "../dto/update-department.dto";
import { Department } from "../entities/department.entity";
import { DepartmentService } from "../services/department.service";

@Controller("department")
@ApiTags("department")
export class DepartmentController extends BaseControllerFactory<Department>(
    Department,
    DepartmentConditionDto,
    CreateDepartmentDto,
    UpdateDepartmentDto,
    CrudControllerConfig(),
) {
    constructor(private readonly departmentService: DepartmentService) {
        super(departmentService);
    }
}
