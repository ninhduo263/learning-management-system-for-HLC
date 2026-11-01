import { AuditLogModel } from "@module/repository/sequelize/model/audit-log.model";
import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { ModelCtor } from "sequelize-typescript";
import { AuditLog } from "../entities/audit-log.entity";
import { AuditLogRepository } from "./audit-log-repository.interface";

export class AuditLogSqlRepository
    extends SqlRepository<AuditLog>
    implements AuditLogRepository
{
    constructor(
        @InjectModel(AuditLogModel)
        private readonly auditLogModel: ModelCtor<AuditLogModel>,
    ) {
        super(auditLogModel);
    }
}
