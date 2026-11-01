import { QueueName } from "@common/constant";
import { Entity } from "@module/repository";
import { InjectRepository } from "@module/repository/common/repository";
import {
    OnQueueActive,
    OnQueueCompleted,
    OnQueueError,
    OnQueueFailed,
    Process,
    Processor,
} from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job } from "bull";
import { AuditLog } from "./entities/audit-log.entity";
import { AuditLogRepository } from "./repository/audit-log-repository.interface";

@Processor(QueueName.AUDIT_LOG)
export class AuditLogProcessor {
    private readonly logger = new Logger(AuditLogProcessor.name);

    constructor(
        @InjectRepository(Entity.AUDIT_LOG)
        private readonly auditLogRepository: AuditLogRepository,
    ) {}

    @OnQueueActive()
    onActive(job: Job) {
        this.logger.verbose(
            `Activating Audit Log job ${job.id} of type ${job.name}`,
        );
    }

    @OnQueueCompleted()
    onCompleted(job: Job) {
        this.logger.verbose(`Audit Log job ${job.id} - ${job.name} complete`);
    }

    @OnQueueError()
    onError(err: any) {
        this.logger.error(`Error job ${err}`);
    }

    @OnQueueFailed()
    onFailed(job: Job, error: Error) {
        this.logger.error(
            `Failed job ${job.id} of type ${job.name} with error: ${error.message}`,
        );
    }

    @Process("emit-log")
    async sendBatch(job: Job<{ log: AuditLog }>) {
        const { log } = job.data;
        await this.auditLogRepository.create(log);
    }
}
