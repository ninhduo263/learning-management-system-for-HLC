import { QueueName } from "@common/constant";
import { Entity } from "@module/repository";
import {
    RepositoryProvider,
    RepositoryProviderName,
} from "@module/repository/common/repository";
import { TransactionProvider } from "@module/repository/common/transaction";
import { MongoTransaction } from "@module/repository/mongo/mongo.transaction";
import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { AuditLogController } from "./audit-log.controller";
import { AuditLogProcessor } from "./audit-log.process";
import { AuditLogService } from "./audit-log.service";
import { AuditLogMongoRepository } from "./repository/audit-log-mongo.repository";

@Module({
    imports: [
        BullModule.registerQueue({
            name: QueueName.AUDIT_LOG,
            defaultJobOptions: {
                attempts: 3,
                removeOnComplete: true,
                removeOnFail: true,
                timeout: 60000,
            },
        }),
    ],
    providers: [
        AuditLogService,
        AuditLogProcessor,
        RepositoryProvider(Entity.AUDIT_LOG, AuditLogMongoRepository),
        TransactionProvider(MongoTransaction),
    ],
    exports: [RepositoryProviderName(Entity.AUDIT_LOG), BullModule],
    controllers: [AuditLogController],
})
export class AuditLogModule {}
