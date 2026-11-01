import { Entity } from "@module/repository";
import { MongoRepository } from "@module/repository/mongo/mongo.repository";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { AuditLog } from "../entities/audit-log.entity";
import { AuditLogRepository } from "./audit-log-repository.interface";

export class AuditLogMongoRepository
    extends MongoRepository<AuditLog>
    implements AuditLogRepository
{
    constructor(
        @InjectModel(Entity.AUDIT_LOG)
        private readonly auditLogModel: Model<AuditLog>,
    ) {
        super(auditLogModel);
    }
}
