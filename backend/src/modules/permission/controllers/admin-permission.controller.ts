import { BaseControllerFactory } from "@config/controller/base-controller-factory";
import { CrudControllerConfig } from "@config/controller/crud-controller-config";
import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AdminPermissionConditionDto } from "../dto/admin-permission-condition.dto";
import { CreateAdminPermissionDto } from "../dto/create-admin-permission.dto";
import { UpdateAdminPermissionDto } from "../dto/update-admin-permission.dto";
import { AdminPermission } from "../entities/admin-permission.entity";
import { AdminPermissionService } from "../services/admin-permission.service";

@Controller("admin-permission")
@ApiTags("admin-permission")
export class AdminPermissionController extends BaseControllerFactory<AdminPermission>(
    AdminPermission,
    AdminPermissionConditionDto,
    CreateAdminPermissionDto,
    UpdateAdminPermissionDto,
    CrudControllerConfig(),
) {
    constructor(
        private readonly adminPermissionService: AdminPermissionService,
    ) {
        super(adminPermissionService);
    }
}
