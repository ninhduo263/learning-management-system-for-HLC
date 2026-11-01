import { DataPartitionInternalService } from "@module/data-partition/services/data-partition-internal.service";
import { Injectable } from "@nestjs/common";
@Injectable()
export class CommonProviderService {
    constructor(public readonly dpiService: DataPartitionInternalService) {}
}
