import { ActivityLogService } from "@module/activity-log/activity-log.service";
import { ApiError } from "@config/exception/api-error";
import { MemberModel } from "@module/member/models/member.model";
import { SystemRole } from "@module/user/common/constant";
import { User } from "@module/user/entities/user.entity";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Op } from "sequelize";
import { GROUP_PERMISSIONS, ROLE_PERMISSION_LABEL } from "../common/constant";
import { DepartmentModel } from "../models/department.model";
import { GroupDelegationModel } from "../models/group-delegation.model";
import { GroupAccessService } from "./group-access.service";

const dmy = (value: string) => value.split("-").reverse().join("/");

/**
 * Ủy quyền tạm thời: người có quyền trong nhóm (Leader...) giao một phần quyền cho người khác
 * trong khoảng thời gian; tự hết hiệu lực khi hết hạn; thu hồi được; mọi thao tác có nhật ký.
 */
@Injectable()
export class DelegationService {
    constructor(
        private readonly access: GroupAccessService,
        private readonly activityLog: ActivityLogService,
        @InjectModel(GroupDelegationModel)
        private readonly delegationModel: typeof GroupDelegationModel,
        @InjectModel(MemberModel)
        private readonly memberModel: typeof MemberModel,
        @InjectModel(DepartmentModel)
        private readonly departmentModel: typeof DepartmentModel,
    ) {}

    private isAdmin(user: User) {
        return user.systemRole === SystemRole.ADMIN;
    }

    private async views(rows: GroupDelegationModel[]) {
        const memberIds = [
            ...new Set(
                rows.flatMap((row) => [row.fromMemberId, row.toMemberId]),
            ),
        ];
        const members = new Map(
            (memberIds.length
                ? await this.memberModel.findAll({
                      where: { _id: memberIds },
                      raw: true,
                  })
                : []
            ).map((item) => [item._id, item]),
        );
        const groups = new Map(
            (rows.length
                ? await this.departmentModel.findAll({
                      where: { _id: rows.map((row) => row.groupId) },
                      raw: true,
                  })
                : []
            ).map((item) => [item._id, item]),
        );
        const today = this.access.today();
        const brief = (id: string) => {
            const item = members.get(id);
            return item
                ? {
                      _id: item._id,
                      memberCode: item.memberCode,
                      fullName: item.fullName,
                  }
                : null;
        };
        return rows.map((row) => ({
            ...row,
            from: brief(row.fromMemberId),
            to: brief(row.toMemberId),
            group: groups.get(row.groupId)
                ? {
                      _id: row.groupId,
                      code: groups.get(row.groupId).code,
                      name: groups.get(row.groupId).name,
                  }
                : null,
            status: row.revokedAt
                ? "REVOKED"
                : row.endDate < today
                  ? "EXPIRED"
                  : row.startDate > today
                    ? "UPCOMING"
                    : "ACTIVE",
        }));
    }

    /** Ủy quyền liên quan đến tôi (đã giao / được nhận); Admin: tất cả hoặc theo nhóm */
    async list(user: User, groupId?: string) {
        if (this.isAdmin(user)) {
            const rows = await this.delegationModel.findAll({
                where: groupId ? { groupId } : {},
                order: [["createdAt", "DESC"]],
                limit: 300,
                raw: true,
            });
            return this.views(rows);
        }
        const member = await this.access.memberOfUser(user);
        if (!member) return [];
        const rows = await this.delegationModel.findAll({
            where: {
                [Op.or]: [
                    { fromMemberId: member._id },
                    { toMemberId: member._id },
                ],
                ...(groupId && { groupId }),
            },
            order: [["createdAt", "DESC"]],
            limit: 300,
            raw: true,
        });
        return this.views(rows);
    }

    async create(
        user: User,
        dto: {
            groupId: string;
            toMemberId: string;
            permissions: string[];
            startDate: string;
            endDate: string;
            reason?: string;
            /** Admin tạo thay cho người ủy quyền */
            fromMemberId?: string;
        },
    ) {
        const fromMemberId = this.isAdmin(user)
            ? dto.fromMemberId
            : (await this.access.memberOfUser(user))?._id;
        if (!fromMemberId)
            throw ApiError.BadRequest("error-delegation-invalid");
        const permissions = [...new Set(dto.permissions ?? [])].filter((item) =>
            GROUP_PERMISSIONS.includes(item),
        );
        // Chỉ giao được quyền mình đang có trong nhóm đó; không tự ủy quyền cho mình
        const own = (await this.access.leadershipOf(fromMemberId, false)).find(
            (item) => item._id === dto.groupId,
        );
        if (
            !own ||
            !permissions.length ||
            permissions.some((item) => !own.permissions.includes(item)) ||
            dto.toMemberId === fromMemberId ||
            !dto.startDate ||
            !dto.endDate ||
            dto.endDate < dto.startDate ||
            dto.endDate < this.access.today()
        )
            throw ApiError.BadRequest("error-delegation-invalid");
        const to = await this.memberModel.findByPk(dto.toMemberId, {
            raw: true,
        });
        const from = await this.memberModel.findByPk(fromMemberId, {
            raw: true,
        });
        if (!to || !from) throw ApiError.NotFound("error-record-not-found");
        const row = await this.delegationModel.create({
            groupId: dto.groupId,
            fromMemberId,
            toMemberId: dto.toMemberId,
            permissions,
            startDate: dto.startDate,
            endDate: dto.endDate,
            reason: dto.reason?.trim() || null,
            createdBy: user._id,
        });
        await this.activityLog.log(user, {
            module: "DELEGATION",
            action: "DELEGATION_CREATE",
            targetId: row._id,
            targetName: own.name,
            summary: `${from.fullName} ủy quyền cho ${to.fullName} tại ${own.name} (${permissions.map((item) => ROLE_PERMISSION_LABEL[item] ?? item).join(", ")}) từ ${dmy(dto.startDate)} đến ${dmy(dto.endDate)}${dto.reason?.trim() ? `. Lý do: ${dto.reason.trim()}` : ""}`,
            detail: { permissions },
        });
        return (await this.views([row.get({ plain: true })]))[0];
    }

    /** Thu hồi trước hạn: người ủy quyền hoặc Admin */
    async revoke(user: User, id: string) {
        const row = await this.delegationModel.findByPk(id);
        if (!row) throw ApiError.NotFound("error-record-not-found");
        if (!this.isAdmin(user)) {
            const member = await this.access.memberOfUser(user);
            if (member?._id !== row.fromMemberId)
                throw ApiError.Forbidden("error-forbidden");
        }
        if (!row.revokedAt)
            await row.update({ revokedAt: new Date(), revokedBy: user._id });
        const [view] = await this.views([row.get({ plain: true })]);
        await this.activityLog.log(user, {
            module: "DELEGATION",
            action: "DELEGATION_REVOKE",
            targetId: row._id,
            targetName: view.group?.name ?? null,
            summary: `Thu hồi ủy quyền của ${view.from?.fullName ?? ""} cho ${view.to?.fullName ?? ""} tại ${view.group?.name ?? ""}`,
        });
        return view;
    }
}
