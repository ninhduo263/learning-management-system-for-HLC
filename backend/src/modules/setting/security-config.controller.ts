import {
    AllowSystemRoles,
    Authorization,
    ReqUser,
} from "@common/decorator/auth.decorator";
import { SystemRole } from "@module/user/common/constant";
import { User } from "@module/user/entities/user.entity";
import { Body, Controller, Get, Put } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SettingSecurity } from "./entities/value/setting-security.entity";
import { SecurityConfigService } from "./security-config.service";

/** Công tắc cấu hình: mọi tài khoản đăng nhập đọc được, chỉ Admin toàn cục sửa */
@Controller("system-config")
@ApiTags("system-config")
@Authorization()
export class SecurityConfigController {
    constructor(private readonly configService: SecurityConfigService) {}

    @Get()
    get() {
        return this.configService.get();
    }

    @Put()
    @AllowSystemRoles(SystemRole.ADMIN)
    set(@ReqUser() user: User, @Body() dto: SettingSecurity) {
        return this.configService.set(user, dto);
    }
}
