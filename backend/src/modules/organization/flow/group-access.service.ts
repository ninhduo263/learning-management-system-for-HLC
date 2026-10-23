import { vnDateKey } from "@common/utils/vn-date.util";
import { MemberModel } from "@module/member/models/member.model";
import { TimeService } from "@module/time/time.service";
import { SystemRole } from "@module/user/common/constant";
import { User } from "@module/user/entities/user.entity";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { DepartmentType, GroupKind } from "../common/constant";
import { DepartmentModel } from "../models/department.model";
import { GroupMembershipModel } from "../models/group-membership.model";
import { MemberPositionModel } from "../models/member-position.model";
import { PositionModel } from "../models/position.model";

export const LEADER_POSITION = "LEADER";
export const DEPUTY_POSITION = "PHO_LEADER";

export type GroupRole = "LEADER" | "DEPUTY";

export interface LeaderGroup {
    _id: string;
    code: string;
    name: string;
    role: GroupRole;
    groupKind: GroupKind;
    /** Được chấm/duyệt (Phó nhóm phụ thuộc cấu hình nhóm) */
    canReview: boolean;
}

/** Phạm vi người duyệt: null = toàn quyền (Admin) */
export interface ReviewerScope {
    isAdmin: boolean;
    memberId: string | null;
    groupIds: string[];
    memberIds: Set<string>;
}

/** Tra cứu nhóm, Leader / Phó nhóm và phạm vi quyền theo nhóm */
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

    async positionIds() {
        const positions = await this.positionModel.findAll({
            where: { code: [LEADER_POSITION, DEPUTY_POSITION] },
            raw: true,
        });
        return {
            leader: positions.find((item) => item.code === LEADER_POSITION)
                ?._id,
            deputy: positions.find((item) => item.code === DEPUTY_POSITION)
                ?._id,
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

    /** groupId -> { leaderId, deputyId } đang giữ hôm nay */
    async leadersOf(groupIds: string[]) {
        const ids = await this.positionIds();
        const rows = groupIds.length
            ? await this.memberPositionModel.findAll({
                  where: {
                      departmentId: groupIds,
                      positionId: [ids.leader, ids.deputy].filter(Boolean),
                      endDate: null,
                  },
                  raw: true,
              })
            : [];
        const result = new Map<
            string,
            { leaderId: string | null; deputyId: string | null }
        >();
        for (const groupId of groupIds) {
            result.set(groupId, {
                leaderId:
                    rows.find(
                        (row) =>
                            row.departmentId === groupId &&
                            row.positionId === ids.leader,
                    )?.memberId ?? null,
                deputyId:
                    rows.find(
                        (row) =>
                            row.departmentId === groupId &&
                            row.positionId === ids.deputy,
                    )?.memberId ?? null,
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

    /** Nhóm mà thành viên đang làm Leader / Phó nhóm */
    async leadershipOf(memberId: string): Promise<LeaderGroup[]> {
        const ids = await this.positionIds();
        const rows = await this.memberPositionModel.findAll({
            where: {
                memberId,
                positionId: [ids.leader, ids.deputy].filter(Boolean),
                endDate: null,
            },
            raw: true,
        });
        if (!rows.length) return [];
        const groups = await this.departmentModel.findAll({
            where: {
                _id: rows.map((row) => row.departmentId),
                type: DepartmentType.GROUP,
                isActive: true,
            },
            raw: true,
        });
        return groups.map((group) => {
            const role: GroupRole = rows.some(
                (row) =>
                    row.departmentId === group._id &&
                    row.positionId === ids.leader,
            )
                ? "LEADER"
                : "DEPUTY";
            return {
                _id: group._id,
                code: group.code,
                name: group.name,
                role,
                groupKind: group.groupKind ?? GroupKind.MENTEE,
                canReview: role === "LEADER" || group.deputyCanReview !== false,
            };
        });
    }

    async memberOfUser(user: Pick<User, "_id">) {
        return this.memberModel.findOne({
            where: { userId: user._id },
            raw: true,
        });
    }

    /** Phạm vi người duyệt theo nhóm. Admin: toàn quyền */
    async reviewerScope(
        user: User,
        options: {
            requireReview?: boolean;
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
        if (options.requireReview)
            groups = groups.filter((group) => group.canReview);
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
