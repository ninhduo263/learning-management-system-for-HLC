import { PartialType } from "@nestjs/swagger";
import { CreateAdminPermissionDto } from "./create-admin-permission.dto";

export class UpdateAdminPermissionDto extends PartialType(
    CreateAdminPermissionDto,
) {}
