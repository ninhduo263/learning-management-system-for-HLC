import { DataPartitionUserSqlRepository } from "@module/data-partition/repository/data-partition-user-sql.repository";
import { DataPartitionSqlRepository } from "@module/data-partition/repository/data-partition-sql.repository";
import { Entity } from "@module/repository";
import { RepositoryProvider } from "@module/repository/common/repository";
import { SqlTransaction } from "@module/repository/sequelize/sql.transaction";
import { Global, Module } from "@nestjs/common";
import { DataPartitionInternalService } from "./services/data-partition-internal.service";
import { DataPartitionUserService } from "./services/data-partition-user.service";
import { DataPartitionService } from "./services/data-partition.service";

@Global()
@Module({
    providers: [
        DataPartitionService,
        DataPartitionUserService,
        DataPartitionInternalService,
        RepositoryProvider(Entity.DATA_PARTITION, DataPartitionSqlRepository),
        RepositoryProvider(
            Entity.DATA_PARTITION_USER,
            DataPartitionUserSqlRepository,
        ),
        SqlTransaction,
    ],
    controllers: [
        // DataPartitionController,
        // DataPartitionUserController,
        // DataPartitionInternalController,
        // DataPartitionUserCommonController,
    ],
    exports: [
        DataPartitionService,
        DataPartitionUserService,
        DataPartitionInternalService,
        SqlTransaction,
    ],
})
export class DataPartitionModule {}
