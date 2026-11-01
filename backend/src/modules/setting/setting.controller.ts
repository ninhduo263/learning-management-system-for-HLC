import {
    AllowSystemRoles,
    Authorization,
} from "@common/decorator/auth.decorator";
import { SystemRole } from "@module/user/common/constant";
import { Body, Controller, Get, Param, Put } from "@nestjs/common";
import { ApiParam, ApiTags } from "@nestjs/swagger";
import { SettingKey } from "./common/constant";
import { SetSettingValue } from "./dto/set-setting-value.dto";
import { SettingService } from "./setting.service";

@Controller("setting")
@ApiTags("setting")
@Authorization()
export class SettingController {
    constructor(private readonly settingService: SettingService) {}
    @Get(":key/value")
    @AllowSystemRoles(SystemRole.ADMIN, SystemRole.USER)
    @ApiParam({ name: "key", enum: SettingKey })
    async getSettingValue(@Param("key") key: SettingKey) {
        return this.settingService.getSettingValue(key);
    }

    @Put("value")
    @AllowSystemRoles(SystemRole.ADMIN)
    async setSetting(@Body() dto: SetSettingValue) {
        return this.settingService.setSettingValue(
            dto.key as SettingKey,
            dto.value,
        );
    }
}
