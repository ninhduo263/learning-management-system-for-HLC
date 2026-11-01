import { ApiGet, ApiListResponse } from "@common/decorator/api.decorator";
import { Authorization, ReqUser } from "@common/decorator/auth.decorator";
import { User } from "@module/user/entities/user.entity";
import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { DataPartitionUser } from "../entities/data-partition-user.entity";
import { DataPartitionUserService } from "../services/data-partition-user.service";

@Controller("data-partition/user")
@ApiTags("data-partition - user")
@Authorization()
export class DataPartitionUserCommonController {
    constructor(
        private readonly dataPartitionUserService: DataPartitionUserService,
    ) {}

    @Get("many/me")
    @ApiGet({ mode: "many" })
    @ApiListResponse(DataPartitionUser)
    async getManyMe(@ReqUser() user: User) {
        return this.dataPartitionUserService.getManyMe(user);
    }
}
