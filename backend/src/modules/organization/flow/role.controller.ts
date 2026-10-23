import {
    AllowSystemRoles,
    Authorization,
} from "@common/decorator/auth.decorator";
import { SystemRole } from "@module/user/common/constant";
import { Body, Controller, Get, Param, Post, Put } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RoleDto } from "./dto/role.dto";
import { ThresholdDto } from "./dto/threshold.dto";
import { RoleService } from "./role.service";

/** Vai trò = chức vụ + quyền hạn + điểm (Admin tổng) */
@Controller("roles")
@ApiTags("roles")
@Authorization()
@AllowSystemRoles(SystemRole.ADMIN)
export class RoleController {
    constructor(private readonly roleService: RoleService) {}

    @Get()
    list() {
        return this.roleService.list();
    }

    @Post()
    create(@Body() dto: RoleDto) {
        return this.roleService.save(dto);
    }

    @Put(":id")
    update(@Param("id") id: string, @Body() dto: RoleDto) {
        return this.roleService.save(dto, id);
    }

    /** Ngưỡng % hoàn thành theo loại nhóm */
    @Get("thresholds/all")
    thresholds() {
        return this.roleService.thresholds();
    }

    @Put("thresholds/all")
    saveThresholds(@Body() dto: ThresholdDto) {
        return this.roleService.saveThresholds({
            MENTEE: dto.MENTEE,
            FUND: dto.FUND,
        });
    }
}
