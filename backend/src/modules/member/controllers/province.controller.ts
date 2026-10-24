import {
    AllowSystemRoles,
    Authorization,
    ReqUser,
} from "@common/decorator/auth.decorator";
import { SystemRole } from "@module/user/common/constant";
import { User } from "@module/user/entities/user.entity";
import { Body, Controller, Get, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ProvinceDto } from "../dto/province.dto";
import { ProvinceService } from "../services/province.service";

/** Danh mục tỉnh, thành phố (mọi tài khoản đọc; Admin toàn cục cập nhật) */
@Controller("provinces")
@ApiTags("provinces")
@Authorization()
export class ProvinceController {
    constructor(private readonly provinceService: ProvinceService) {}

    @Get()
    list(@Query("all") all?: string) {
        return this.provinceService.list(all === "true");
    }

    @Put()
    @AllowSystemRoles(SystemRole.ADMIN)
    save(@ReqUser() user: User, @Body() dto: ProvinceDto) {
        return this.provinceService.save(user, dto);
    }
}
