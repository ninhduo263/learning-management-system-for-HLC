import { vnDateKey } from "@common/utils/vn-date.util";
import { MemberModel } from "@module/member/models/member.model";
import { TimeService } from "@module/time/time.service";
import { SystemRole } from "@module/user/common/constant";
import { User } from "@module/user/entities/user.entity";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Op } from "sequelize";
import { DepartmentType, GroupKind, RolePermission } from "../common/constant";
import { DepartmentModel } from "../models/department.model";
import { GroupMembershipModel } from "../models/group-membership.model";
import { MemberPositionModel } from "../models/member-position.model";
import { PositionModel } from "../models/position.model";

/** Mã vai trò Leader / Phó nhóm mặc định theo loại nhóm */
export const KIND_ROLE_CODES: Record<
    GroupKind,
    { leader: string; deputy: string }
> = {
    [GroupKind.MENTEE]: { leader: "LEADER", deputy: "PHO_LEADER" },
    [GroupKind.FUND]: { leader: "FUND_LEADER", deputy: "FUND_PHO_LEADER" },
};
const LEADER_CODES = Object.values(KIND_ROLE_CODES).map((item) => item.leader);
const DEPUTY_CODES = Object.values(KIND_ROLE_CODES).map((item) => item.deputy);

export type GroupRole = "LEADER" | "DEPUTY";

export interface LeaderGroup {
    _id: string;
    code: string;
    name: string;
    /** Vai trò chuẩn hóa để hiển thị (LEADER / DEPUTY / mã vai trò khác) */
    role: string;
    roleCode: string;
    roleName: string;
    groupKind: GroupKind;
    permissions: string[];
    /** Có quyền chấm/duyệt (SCORE_RECAP hoặc REVIEW_FUND) */
    canReview: boolean;
}

/** Phạm vi người duyệt: isAdmin = toàn quyền */
export interface ReviewerScope {
    isAdmin: boolean;
    memberId: string | null;
    groupIds: string[];
    memberIds: Set<string>;
}

/**
 * Tra cứu nhóm và vai trò. Quyền hạn của người giữ chức lấy từ cấu hình vai trò (Position.permissions);
 * chức vụ có thời gian hiệu lực (startDate .. endDate, tính cả 2 đầu).
 */
@Injectable()
export class GroupAccessService {
    constructor(
        private readonly timeService: TimeService,
        @InjectModel(DepartmentModel)
        private readonly departmentModel: typeof DepartmentModel,
        @InjectModel(PositionModel)
        private readonly positionModel: typeof PositionModel,
        @InjectModel(MemberPositionModel)
        private readonly memberPositionModel: typeof MemberPositionModel,
        @InjectModel(GroupMembershipModel)
        private readonly membershipModel: typeof GroupMembershipModel,
        @InjectModel(MemberModel)
        private readonly memberModel: typeof MemberModel,
    ) {}

    today() {
        return vnDateKey(this.timeService.now());
    }

    /** Vai trò Leader / Phó mặc định của loại nhóm */
    async positionIds(kind: GroupKind | string = GroupKind.MENTEE) {
        const codes =
            KIND_ROLE_CODES[kind as GroupKind] ??
            KIND_ROLE_CODES[GroupKind.MENTEE];
        const positions = await this.positionModel.findAll({
            where: { code: [codes.leader, codes.deputy] },
            raw: true,
        });
        return {
            leader: positions.find((item) => item.code === codes.leader)?._id,
            deputy: positions.find((item) => item.code === codes.deputy)?._id,
        };
    }

    async groups(includeInactive = false, kind?: GroupKind) {
        return this.departmentModel.findAll({
            where: {
                type: DepartmentType.GROUP,
                ...(kind && { groupKind: kind }),
                ...(!includeInactive && { isActive: true }),
            },
            order: [["code", "ASC"]],
            raw: true,
        });
    }

    /**
     * Người đang giữ chức hôm nay. Mỗi (ban/nhóm, vai trò) chỉ 1 người: bản ghi bắt đầu muộn nhất
     * (ngày bàn giao: người mới giữ quyền).
     */
    async activeHolders(
        where: { departmentId?: string[]; memberId?: string } = {},
    ) {
        const today = this.today();
        const rows = await this.memberPositionModel.findAll({
            where: {
                ...(where.departmentId && { departmentId: where.departmentId }),
                startDate: { [Op.lte]: today },
                [Op.or]: [{ endDate: null }, { endDate: { [Op.gte]: today } }],
            },
            order: [
                ["startDate", "DESC"],
                ["createdAt", "DESC"],
            ],
            raw: true,
        });
        const seen = new Set<string>();
        const holders = rows.filter((row) => {
            const key = `${row.departmentId}|${row.positionId}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
        const positions = new Map(
            (holders.length
                ? await this.positionModel.findAll({
                      where: {
                          _id: [
                              ...new Set(holders.map((row) => row.positionId)),
                          ],
                      },
                      raw: true,
                  })
                : []
            ).map((item) => [item._id, item]),
        );
        return holders
            .filter((row) => !where.memberId || row.memberId === where.memberId)
            .map((row) => ({ ...row, position: positions.get(row.positionId) }))
            .filter((row) => row.position && row.position.isActive !== false);
    }

    /** groupId -> Leader, Phó nhóm và mọi người giữ vai trò hôm nay */
    async leadersOf(groupIds: string[]) {
        const holders = groupIds.length
            ? await this.activeHolders({ departmentId: groupIds })
            : [];
        const result = new Map<
            string,
            {
                leaderId: string | null;
                deputyId: string | null;
                holders: {
                    memberId: string;
                    roleCode: string;
                    roleName: string;
                }[];
            }
        >();
        for (const groupId of groupIds) {
            const own = holders.filter((row) => row.departmentId === groupId);
            result.set(groupId, {
                leaderId:
                    own.find((row) => LEADER_CODES.includes(row.position.code))
                        ?.memberId ?? null,
                deputyId:
                    own.find((row) => DEPUTY_CODES.includes(row.position.code))
                        ?.memberId ?? null,
                holders: own.map((row) => ({
                    memberId: row.memberId,
                    roleCode: row.position.code,
                    roleName: row.position.name,
                })),
            });
        }
        return result;
    }

    /** Thành viên hiện tại của các nhóm */
    async currentMemberships(groupIds?: string[]) {
        return this.membershipModel.findAll({
            where: { endDate: null, ...(groupIds && { groupId: groupIds }) },
            raw: true,
        });
    }

    /** Nhóm hiện tại của thành viên (theo loại nhóm nếu truyền kind) */
    async groupOfMember(memberId: string, kind?: GroupKind) {
        const rows = await this.membershipModel.findAll({
            where: { memberId, endDate: null },
            raw: true,
        });
        if (!rows.length) return null;
        if (!kind) return rows[0].groupId;
        const group = await this.departmentModel.findOne({
            where: { _id: rows.map((row) => row.groupId), groupKind: kind },
            raw: true,
        });
        return group?._id ?? null;
    }

    /** Nhóm mà thành viên đang giữ vai trò (kèm quyền hạn theo cấu hình vai trò) */
    async leadershipOf(memberId: string): Promise<LeaderGroup[]> {
        const holders = await this.activeHolders({ memberId });
        if (!holders.length) return [];
        const groups = new Map(
            (
                await this.departmentModel.findAll({
                    where: {
                        _id: holders.map((row) => row.departmentId),
                        type: DepartmentType.GROUP,
                        isActive: true,
                    },
                    raw: true,
                })
            ).map((group) => [group._id, group]),
        );
        const result = new Map<string, LeaderGroup>();
        for (const holder of holders) {
            const group = groups.get(holder.departmentId);
            if (!group) continue;
            const kind = (group.groupKind ?? GroupKind.MENTEE) as GroupKind;
            // Vai trò phải thuộc đúng loại nhóm
            if (holder.position.groupKind && holder.position.groupKind !== kind)
                continue;
            const permissions = (holder.position.permissions ?? []) as string[];
            const existing = result.get(group._id);
            const role = LEADER_CODES.includes(holder.position.code)
                ? "LEADER"
                : DEPUTY_CODES.includes(holder.position.code)
                  ? "DEPUTY"
                  : holder.position.code;
            const merged = [
                ...new Set([...(existing?.permissions ?? []), ...permissions]),
            ];
            result.set(group._id, {
                _id: group._id,
                code: group.code,
                name: group.name,
                role: existing && existing.role === "LEADER" ? "LEADER" : role,
                roleCode: existing?.roleCode ?? holder.position.code,
                roleName: existing
                    ? `${existing.roleName}, ${holder.position.name}`
                    : holder.position.name,
                groupKind: kind,
                permissions: merged,
                canReview:
                    merged.includes(RolePermission.SCORE_RECAP) ||
                    merged.includes(RolePermission.REVIEW_FUND),
            });
        }
        return [...result.values()];
    }

    /** Quyền quản trị hệ thống có được từ vai trò đang giữ (Position.adminScope) */
    async adminScopesOf(memberId: string) {
        return [
            ...new Set(
                (await this.activeHolders({ memberId }))
                    .map((row) => row.position.adminScope)
                    .filter(Boolean),
            ),
        ] as string[];
    }

    async memberOfUser(user: Pick<User, "_id">) {
        return this.memberModel.findOne({
            where: { userId: user._id },
            raw: true,
        });
    }

    /** Phạm vi theo nhóm: nhóm có quyền `permission` (nếu truyền). Admin: toàn quyền */
    async reviewerScope(
        user: User,
        options: {
            permission?: RolePermission;
            groupId?: string;
            kind?: GroupKind;
        } = {},
    ): Promise<ReviewerScope> {
        if (user.systemRole === SystemRole.ADMIN) {
            const memberIds = options.groupId
                ? new Set(
                      (await this.currentMemberships([options.groupId])).map(
                          (row) => row.memberId,
                      ),
                  )
                : new Set<string>();
            return {
                isAdmin: !options.groupId,
                memberId: null,
                groupIds: options.groupId ? [options.groupId] : [],
                memberIds,
            };
        }
        const member = await this.memberOfUser(user);
        if (!member)
            return {
                isAdmin: false,
                memberId: null,
                groupIds: [],
                memberIds: new Set(),
            };
        let groups = await this.leadershipOf(member._id);
        if (options.permission)
            groups = groups.filter((group) =>
                group.permissions.includes(options.permission),
            );
        if (options.groupId)
            groups = groups.filter((group) => group._id === options.groupId);
        if (options.kind)
            groups = groups.filter((group) => group.groupKind === options.kind);
        const groupIds = groups.map((group) => group._id);
        const memberIds = new Set(
            (groupIds.length
                ? await this.currentMemberships(groupIds)
                : []
            ).map((row) => row.memberId),
        );
        return { isAdmin: false, memberId: member._id, groupIds, memberIds };
    }
}
