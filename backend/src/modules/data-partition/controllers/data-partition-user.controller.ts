import { BaseControllerFactory } from "@config/controller/base-controller-factory";
import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { DataPartitionUser } from "../entities/data-partition-user.entity";
import { DataPartitionUserService } from "../services/data-partition-user.service";

@Controller("data-partition/user")
@ApiTags("data-partition - user")
export class DataPartitionUserController extends BaseControllerFactory(
    DataPartitionUser,
    null,
    null,
    null,
) {
    constructor(
        private readonly dataPartitionUserService: DataPartitionUserService,
    ) {
        super(dataPartitionUserService);
    }
}
