import { ApiRecordResponse } from "@common/decorator/api.decorator";
import {
    Authorization,
    ReqPayload,
    ReqUser,
} from "@common/decorator/auth.decorator";
import { AccessSsoJwtPayload } from "@module/auth/auth.interface";
import { UpdateOneSignalUserDto } from "@module/one-signal/dto/update-onesignal-user.dto";
import { OneSignalService } from "@module/one-signal/one-signal.service";
import { User } from "@module/user/entities/user.entity";
import { Body, Controller, Put } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { OneSignalUser } from "./entities/one-signal-user.entity";

@Controller("one-signal")
@ApiTags("one-signal")
@Authorization()
export class OneSignalController {
    constructor(private readonly oneSignalService: OneSignalService) {}

    @ApiRecordResponse(OneSignalUser)
    @Put("user")
    async updateOneSignalUser(
        @ReqUser() user: User,
        @ReqPayload() payload: AccessSsoJwtPayload,
        @Body() dto: UpdateOneSignalUserDto,
    ) {
        return this.oneSignalService.updateOneSignalUser(user, payload, dto);
    }
}
