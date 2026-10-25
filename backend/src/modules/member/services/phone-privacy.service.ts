import { MentoringPairStatus } from "@module/mentoring/common/constant";
import { MentoringPairModel } from "@module/mentoring/models/mentoring-pair.model";
import { GroupAccessService } from "@module/organization/flow/group-access.service";
import { GroupMembershipModel } from "@module/organization/models/group-membership.model";
import { User } from "@module/user/entities/user.entity";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Op } from "sequelize";
import { MemberModel } from "../models/member.model";

type PhoneHolder = Record<string, unknown> & { _id: string; phone: unknown };

/**
 * Ẩn số điện thoại (vòng 9). Thành viên bật "Ẩn số điện thoại với người ngoài cặp và nhóm của tôi" thì số điện thoại
 * (và liên kết Zalo, vì liên kết tạo từ số) chỉ trả cho:
 * - chính chủ;
 * - người trong cặp mentoring đang hoạt động với họ;
 * - người cùng nhóm: thành viên, Leader, Phó nhóm (và người giữ vai trò khác) của nhóm đó;
 * - Admin toàn cục và các Trưởng ban (cần số để làm việc).
 * Người khác nhận `phone: null` kèm `phoneHidden: true`. Mặc định (không bật ẩn) số hiển thị cho mọi thành viên.
 */
@Injectable()
export class PhonePrivacyService {
    constructor(
        @InjectModel(MemberModel)
        private readonly memberModel: typeof MemberModel,
        @InjectModel(MentoringPairModel)
        private readonly pairModel: typeof MentoringPairModel,
        @InjectModel(GroupMembershipModel)
        private readonly membershipModel: typeof GroupMembershipModel,
        private readonly groupAccess: GroupAccessService,
    ) {}

    /** Mã thành viên (trong `targetIds`) mà người xem được thấy số dù chủ số đã bật ẩn */
    async visibleTo(viewer: User | null, targetIds: string[]) {
        if (!viewer) return new Set<string>();
        const caps = await this.groupAccess.capabilities(viewer);
        if (caps.superAdmin || caps.departmentHead) return new Set(targetIds);
        const me = caps.memberId;
        if (!me) return new Set<string>();
        const visible = new Set<string>([me]);
        const pairs = await this.pairModel.findAll({
            where: {
                status: MentoringPairStatus.ACTIVE,
                [Op.or]: [{ mentorId: me }, { menteeId: me }],
            },
            attributes: ["mentorId", "menteeId"],
            raw: true,
        });
        for (const pair of pairs)
            visible.add(pair.mentorId === me ? pair.menteeId : pair.mentorId);
        // Nhóm của tôi: nhóm tôi là thành viên hoặc giữ vai trò trong nhóm (chức vụ cấp ban không tính)
        const groupIds = new Set(
            (await this.groupAccess.groups(true)).map((group) => group._id),
        );
        const memberships = await this.membershipModel.findAll({
            where: { memberId: me, endDate: null },
            attributes: ["groupId"],
            raw: true,
        });
        const holders = await this.groupAccess.activeHolders({ memberId: me });
        const myGroups = [
            ...new Set([
                ...memberships.map((row) => row.groupId),
                ...holders.map((row) => row.departmentId),
            ]),
        ].filter((id) => groupIds.has(id));
        if (myGroups.length) {
            for (const row of await this.groupAccess.currentMemberships(
                myGroups,
            ))
                visible.add(row.memberId);
            for (const row of await this.groupAccess.activeHolders({
                departmentId: myGroups,
            }))
                visible.add(row.memberId);
        }
        return visible;
    }

    /**
     * Che số điện thoại trong dữ liệu trả về (mọi object có `_id` và `phone`, ở bất kỳ độ sâu nào). Dùng cho mọi API
     * nên các màn hình ghép cặp, nhóm, hồ sơ không phải tự lọc.
     */
    async redact(data: unknown, viewer: User | null) {
        const holders = collectPhoneHolders(data);
        if (!holders.length) return;
        const ids = [...new Set(holders.map((item) => item._id))];
        const hidden = new Set(
            (
                await this.memberModel.findAll({
                    where: { _id: ids, hidePhone: true },
                    attributes: ["_id"],
                    raw: true,
                })
            ).map((row) => row._id),
        );
        if (!hidden.size) return;
        const visible = await this.visibleTo(viewer, [...hidden]);
        for (const item of holders)
            if (hidden.has(item._id) && !visible.has(item._id)) {
                item.phone = null;
                item.phoneHidden = true;
            }
    }
}

/** Duyệt dữ liệu trả về, lấy các object giống hồ sơ thành viên (có `_id` dạng chuỗi và trường `phone`) */
function collectPhoneHolders(data: unknown) {
    const found: PhoneHolder[] = [];
    const seen = new Set<object>();
    const visit = (value: unknown, depth: number) => {
        if (!value || typeof value !== "object" || depth > 12) return;
        if (seen.has(value)) return;
        seen.add(value);
        if (
            Buffer.isBuffer(value) ||
            value instanceof Date ||
            typeof (value as { pipe?: unknown }).pipe === "function"
        )
            return;
        if (Array.isArray(value)) {
            for (const item of value) visit(item, depth + 1);
            return;
        }
        // Bản ghi Sequelize chưa chuyển sang plain: dữ liệu nằm trong dataValues
        const record = (
            (value as { dataValues?: unknown }).dataValues &&
            typeof (value as { get?: unknown }).get === "function"
                ? (value as { dataValues: object }).dataValues
                : value
        ) as Record<string, unknown>;
        if (
            typeof record._id === "string" &&
            Object.prototype.hasOwnProperty.call(record, "phone") &&
            record.phone
        )
            found.push(record as PhoneHolder);
        for (const child of Object.values(record)) visit(child, depth + 1);
    };
    visit(data, 0);
    return found;
}
