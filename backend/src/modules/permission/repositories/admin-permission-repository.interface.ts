import { BaseRepository } from "@module/repository/common/base-repository.interface";
import { AdminPermission } from "../entities/admin-permission.entity";

export interface AdminPermissionRepository
    extends BaseRepository<AdminPermission> {}
