import { Authorization, ReqUser } from "@common/decorator/auth.decorator";
import { User } from "@module/user/entities/user.entity";
import { Controller, Get, Query, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { MemberExportService } from "../services/member-export.service";

/** Xuất danh sách thành viên bản đầy đủ (quyền kiểm tra trong service, có nhật ký) */
@Controller("member-export")
@ApiTags("member")
@Authorization()
export class MemberExportController {
    constructor(private readonly exportService: MemberExportService) {}

    /** ?type=MENTEE | MENTOR (bỏ trống = tất cả) */
    @Get("members.xlsx")
    async export(
        @ReqUser() user: User,
        @Res() res: Response,
        @Query("type") type?: string,
    ) {
        const { fileName, buffer } = await this.exportService.export(
            user,
            type,
        );
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${fileName}"`,
        );
        res.send(buffer);
    }
}
