import { BaseRepository } from "@module/repository/common/base-repository.interface";
import { AuditLog } from "../entities/audit-log.entity";

export interface AuditLogRepository extends BaseRepository<AuditLog> {}
