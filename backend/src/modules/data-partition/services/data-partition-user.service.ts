import { BaseService } from "@config/service/base.service";
import { InjectTcpClient } from "@module/microservice/tcp/tcp-client.provider";
import { Entity } from "@module/repository";
import { InjectRepository } from "@module/repository/common/repository";
import { User } from "@module/user/entities/user.entity";
import { Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { lastValueFrom } from "rxjs";
import { DataPartitionUser } from "../entities/data-partition-user.entity";
import { DataPartition } from "../entities/data-partition.entity";
import { DataPartitionUserRepository } from "../repository/data-partition-user-repository.interface";

@Injectable()
export class DataPartitionUserService extends BaseService<
    DataPartitionUser,
    DataPartitionUserRepository
> {
    constructor(
        @InjectRepository(Entity.DATA_PARTITION_USER)
        private readonly dataPartitionUserRepository: DataPartitionUserRepository,
        @InjectTcpClient("core")
        private readonly coreTcpClient: ClientProxy,
    ) {
        super(dataPartitionUserRepository);
    }

    async getOneDpUser(
        dataPartitionCode: string,
        userId: string,
        option?: {
            model?: "local" | "core";
        },
    ): Promise<DataPartition> {
        switch (option?.model) {
            case "core": {
                const res = await lastValueFrom<DataPartitionUser>(
                    this.coreTcpClient.send("data-partition-user/get-one", {
                        conditions: { dataPartitionCode, userId },
                        query: { population: [{ path: "dataPartition" }] },
                    }),
                );
                return res?.dataPartition;
            }
            case "local":
            default: {
                const res = await this.dataPartitionUserRepository.getOne(
                    {
                        dataPartitionCode,
                        userId,
                    },
                    { population: [{ path: "dataPartition" }] },
                );
                return res?.dataPartition;
            }
        }
    }

    async getManyMe(user: User) {
        return this.dataPartitionUserRepository.getMany(
            { userId: user.ssoId },
            { population: [{ path: "dataPartition" }] },
        );
    }
}
