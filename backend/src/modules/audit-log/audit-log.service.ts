import { GetPageQuery } from "@common/constant";
import { Configuration } from "@config/configuration";
import { BaseService } from "@config/service/base.service";
import { Entity } from "@module/repository";
import { QueryCondition } from "@module/repository/common/base-repository.interface";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { InjectTransaction } from "@module/repository/common/transaction";
import { User } from "@module/user/entities/user.entity";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import moment from "moment";
import { AuditLog } from "./entities/audit-log.entity";
import { AuditLogRepository } from "./repository/audit-log-repository.interface";

@Injectable()
export class AuditLogService extends BaseService<AuditLog, AuditLogRepository> {
    constructor(
        @InjectRepository(Entity.AUDIT_LOG)
        private readonly auditLogRepository: AuditLogRepository,
        @InjectTransaction()
        private readonly transaction: BaseTransaction,

        private readonly configService: ConfigService<Configuration>,
    ) {
        super(auditLogRepository, { transaction });
    }

    async getPageMe(
        user: User,
        condition: QueryCondition<AuditLog>,
        query: GetPageQuery<AuditLog>,
    ) {
        condition.uId = user._id;
        return this.getPage(user, condition, query);
    }

    @Cron("0 */12 * * *")
    async clearOldLog() {
        const serverMaster = this.configService.get("server.master", {
            infer: true,
        });
        if (serverMaster === "1") {
            const twoYearAgo = moment().subtract(2, "year");
            await this.auditLogRepository.deleteMany({
                createdAt: { $lte: twoYearAgo.toDate() },
            });
        }
    }
}
