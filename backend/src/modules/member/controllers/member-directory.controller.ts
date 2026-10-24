import { Authorization } from "@common/decorator/auth.decorator";
import { Controller, Get, Query } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { ApiTags } from "@nestjs/swagger";
import { MemberStatus, MemberType } from "../common/constant";
import { MemberModel } from "../models/member.model";
import { GroupAccessService } from "@module/organization/flow/group-access.service";

/**
 * Danh bạ rút gọn (mã, họ tên, loại, trạng thái) cho các màn hình chọn người: Leader ủy quyền, Trưởng ban gán
 * module / nhóm. Không có dữ liệu cá nhân nhạy cảm.
 */
@Controller("member-directory")
@ApiTags("member")
@Authorization()
export class MemberDirectoryController {
    constructor(
        @InjectModel(MemberModel)
        private readonly memberModel: typeof MemberModel,
        private readonly groupAccess: GroupAccessService,
    ) {}

    /** Nhóm đang hoạt động (mã, tên, loại) để chọn khi gán module theo nhóm */
    @Get("groups")
    async groups() {
        return (await this.groupAccess.groups(false)).map((group) => ({
            _id: group._id,
            code: group.code,
            name: group.name,
            groupKind: group.groupKind,
        }));
    }

    /** ?type=MENTEE|MENTOR&all=true (mặc định chỉ đang hoạt động) */
    @Get()
    async list(@Query("type") type?: string, @Query("all") all?: string) {
        const rows = await this.memberModel.findAll({
            where: {
                ...(Object.values(MemberType).includes(type as MemberType) && {
                    memberType: type,
                }),
                ...(all !== "true" && { status: MemberStatus.ACTIVE }),
            },
            attributes: [
                "_id",
                "memberCode",
                "fullName",
                "memberType",
                "status",
            ],
            order: [["memberCode", "ASC"]],
            raw: true,
        });
        return rows;
    }
}
