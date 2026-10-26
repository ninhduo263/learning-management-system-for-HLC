import {
    AllowSystemRoles,
    Authorization,
    ReqUser,
} from "@common/decorator/auth.decorator";
import { SystemRole } from "@module/user/common/constant";
import { User } from "@module/user/entities/user.entity";
import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CreateMemberAdminDto } from "../dto/create-member-admin.dto";
import { MemberAdminService } from "../services/member-admin.service";

/** Thêm thành viên mới: chỉ Admin toàn cục */
@Controller("member-admin")
@ApiTags("member")
@Authorization()
@AllowSystemRoles(SystemRole.ADMIN)
export class MemberAdminController {
    constructor(private readonly adminService: MemberAdminService) {}

    /** Mã sẽ cấp cho loại thành viên (kèm cảnh báo nếu phải dùng số lớn nhất + 1) */
    @Get("next-code")
    nextCode(@Query("type") type: string) {
        return this.adminService.nextCode(type);
    }

    @Get("banks")
    banks() {
        return this.adminService.banks();
    }

    /** Kiểm tra trước khi lưu: mã sẽ cấp, hồ sơ trùng họ tên + ngày sinh, trùng CCCD */
    @Post("precheck")
    precheck(@Body() dto: CreateMemberAdminDto) {
        return this.adminService.precheck(dto);
    }

    @Post("members")
    create(@ReqUser() user: User, @Body() dto: CreateMemberAdminDto) {
        return this.adminService.create(user, dto);
    }

    /** Ghi đè mật khẩu: hệ thống tự sinh mật khẩu mới, chỉ hiện một lần */
    @Post("members/:id/reset-password")
    resetPassword(@ReqUser() user: User, @Param("id") id: string) {
        return this.adminService.resetPassword(user, id);
    }

    @Get("members/:id/sensitive")
    sensitive(@ReqUser() user: User, @Param("id") id: string) {
        return this.adminService.sensitive(user, id);
    }
}
