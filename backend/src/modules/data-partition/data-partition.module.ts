import { Entity } from "@module/repository";
import { RepositoryProvider } from "@module/repository/common/repository";
import { MongoTransaction } from "@module/repository/mongo/mongo.transaction";
import { SqlTransaction } from "@module/repository/sequelize/sql.transaction";
import { Global, Module } from "@nestjs/common";
import { DataPartitionMongoRepository } from "./repository/data-partition-mongo.repository";
import { DataPartitionUserMongoRepository } from "./repository/data-partition-user-mongo.repository";
import { DataPartitionInternalService } from "./services/data-partition-internal.service";
import { DataPartitionUserService } from "./services/data-partition-user.service";
import { DataPartitionService } from "./services/data-partition.service";

@Global()
@Module({
    providers: [
        DataPartitionService,
        DataPartitionUserService,
        DataPartitionInternalService,
        RepositoryProvider(Entity.DATA_PARTITION, DataPartitionMongoRepository),
        RepositoryProvider(
            Entity.DATA_PARTITION_USER,
            DataPartitionUserMongoRepository,
        ),
        MongoTransaction,
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
        MongoTransaction,
        SqlTransaction,
    ],
})
export class DataPartitionModule {}
