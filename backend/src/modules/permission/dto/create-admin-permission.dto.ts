import { OmitType } from "@nestjs/swagger";
import { AdminPermission } from "../entities/admin-permission.entity";

export class CreateAdminPermissionDto extends OmitType(AdminPermission, [
    "_id",
]) {}
