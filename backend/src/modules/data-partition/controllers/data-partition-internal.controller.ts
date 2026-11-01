import { GetOneQuery, GetPageQuery } from "@common/constant";
import { InternalController } from "@common/decorator/route.decorator";
import { QueryCondition } from "@module/repository/common/base-repository.interface";
import { MessagePattern, Transport } from "@nestjs/microservices";
import { DataPartitionUser } from "../entities/data-partition-user.entity";
import { DataPartition } from "../entities/data-partition.entity";
import { DataPartitionUserService } from "../services/data-partition-user.service";
import { DataPartitionService } from "../services/data-partition.service";

@InternalController("data-partition")
export class DataPartitionInternalController {
    constructor(
        private readonly dataPartitionUserService: DataPartitionUserService,
        private readonly dataPartitionService: DataPartitionService,
    ) {}

    @MessagePattern("data-partition-user/get-one", Transport.TCP)
    async getMe(data: {
        conditions: QueryCondition<DataPartitionUser>;
        query: GetOneQuery<DataPartitionUser>;
    }) {
        const { conditions, query } = data;
        return this.dataPartitionUserService.getOne(null, conditions, query);
    }

    @MessagePattern("data-partition/page", Transport.TCP)
    async getPage(data: {
        conditions: QueryCondition<DataPartition>;
        query: GetPageQuery<DataPartition>;
    }) {
        const { conditions, query } = data;
        return this.dataPartitionService.getPage(null, conditions, query);
    }
}
