import { PartialType } from "@nestjs/swagger";
import { AdminPermission } from "../entities/admin-permission.entity";

export class AdminPermissionConditionDto extends PartialType(AdminPermission) {}
