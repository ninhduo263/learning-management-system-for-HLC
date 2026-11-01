import {
    AllowSystemRoles,
    Authorization,
    ReqUser,
} from "@common/decorator/auth.decorator";
import { SystemRole } from "@module/user/common/constant";
import { User } from "@module/user/entities/user.entity";
import { Body, Controller, Get, Param, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CatalogService } from "./catalog.service";
import { CatalogItemDto } from "./catalog-item.dto";

/** Danh mục ngành nghề / ngân hàng: mọi tài khoản đọc, Admin toàn cục cập nhật */
@Controller("catalogs")
@ApiTags("catalogs")
@Authorization()
export class CatalogController {
    constructor(private readonly catalogService: CatalogService) {}

    /** type = CAREER | BANK; ?all=true gồm cả mục đã ẩn / gộp */
    @Get(":type")
    list(@Param("type") type: string, @Query("all") all?: string) {
        return this.catalogService.list(type.toUpperCase(), all === "true");
    }

    @Put(":type")
    @AllowSystemRoles(SystemRole.ADMIN)
    save(
        @ReqUser() user: User,
        @Param("type") type: string,
        @Body() dto: CatalogItemDto,
    ) {
        return this.catalogService.save(user, type.toUpperCase(), dto);
    }
}
