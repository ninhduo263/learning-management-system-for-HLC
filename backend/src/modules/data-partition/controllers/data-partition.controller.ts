import { BaseControllerFactory } from "@config/controller/base-controller-factory";
import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { DataPartitionService } from "../services/data-partition.service";
import { DataPartition } from "../entities/data-partition.entity";

@Controller("data-partition")
@ApiTags("data-partition")
export class DataPartitionController extends BaseControllerFactory(
    DataPartition,
    null,
    null,
    null,
) {
    constructor(private readonly dataPartitionService: DataPartitionService) {
        super(dataPartitionService);
    }
}
