import { vnDateKey } from "@common/utils/vn-date.util";
import { MemberModel } from "@module/member/models/member.model";
import { TimeService } from "@module/time/time.service";
import { SystemRole } from "@module/user/common/constant";
import { User } from "@module/user/entities/user.entity";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Op } from "sequelize";
import { ApiError } from "@config/exception/api-error";
import { AdminPermissionModel } from "@module/permission/models/admin-permission.model";
import { AdminScope, SCOPE_IMPLIES } from "@module/permission/common/constant";
import {
    DepartmentType,
    GLOBAL_PERMISSIONS,
    GROUP_PERMISSIONS,
    GroupKind,
    RolePermission,
} from "../common/constant";
import { GroupDelegationModel } from "../models/group-delegation.model";
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
    /** Quyền chỉ có nhờ ủy quyền: quyền -> người ủy quyền (thao tác ghi "làm thay cho") */
    delegatedFrom?: Record<string, { memberId: string; name: string }>;
    /** Nguồn quyền: GROUP (vai trò trong nhóm), BAN (vai trò cấp ban theo loại nhóm), DELEGATION */
    source?: "GROUP" | "BAN" | "DELEGATION";
}

/** Quyền tổng hợp của 1 tài khoản */
export interface Capabilities {
    superAdmin: boolean;
    memberId: string | null;
    /** Phạm vi quản trị (đã gồm phạm vi được bao hàm) */
    scopes: Set<string>;
    /** Hành động cấp hệ thống (GLOBAL_PERMISSIONS) */
    actions: Set<string>;
    /** Module học tập được quản lý: null = mọi module (Admin toàn cục, Trưởng ban Học tập, Trưởng ban MTE) */
    moduleIds: string[] | null;
}

/** Phạm vi người duyệt: isAdmin = toàn quyền */
export interface ReviewerScope {
    isAdmin: boolean;
    memberId: string | null;
    groupIds: string[];
    memberIds: Set<string>;
    /** Nhóm có quyền (kèm nguồn quyền, ủy quyền) */
    groups?: LeaderGroup[];
}

/** Thao tác dùng quyền được ủy quyền ở nhóm: trả người ủy quyền để ghi "làm thay cho" */
export function onBehalfOf(
    scope: ReviewerScope,
    groupId: string | null | undefined,
    permission: string,
) {
    if (!groupId) return null;
    return (
        scope.groups?.find((group) => group._id === groupId)?.delegatedFrom?.[
            permission
        ] ?? null
    );
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
        @InjectModel(AdminPermissionModel)
        private readonly permissionModel: typeof AdminPermissionModel,
        @InjectModel(GroupDelegationModel)
        private readonly delegationModel: typeof GroupDelegationModel,
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

    /**
     * Nhóm mà thành viên có quyền, gộp từ 3 nguồn (mỗi nguồn chỉ tác động trong phạm vi của nó):
     * 1. Vai trò trong nhóm (Leader, Phó nhóm...) - đúng loại nhóm của vai trò;
     * 2. Vai trò cấp ban có scopeKinds (ví dụ Phó ban MTE: mọi nhóm MTE), Trưởng ban MTE (adminScope MENTEE:
     *    mọi nhóm MTE, đủ quyền nhóm);
     * 3. Ủy quyền tạm thời còn hiệu lực: tập con quyền của người ủy quyền trong nhóm đó.
     */
    async leadershipOf(
        memberId: string,
        includeDelegations = true,
    ): Promise<LeaderGroup[]> {
        const holders = await this.activeHolders({ memberId });
        const result = new Map<string, LeaderGroup>();
        const allGroups = await this.departmentModel.findAll({
            where: { type: DepartmentType.GROUP, isActive: true },
            order: [["code", "ASC"]],
            raw: true,
        });
        const groups = new Map(allGroups.map((group) => [group._id, group]));
        const merge = (
            group: DepartmentModel,
            role: { code: string; name: string },
            permissions: string[],
            source: "GROUP" | "BAN" | "DELEGATION",
            delegator?: { memberId: string; name: string },
        ) => {
            const kind = (group.groupKind ?? GroupKind.MENTEE) as GroupKind;
            const groupPerms = permissions.filter(
                (item) =>
                    GROUP_PERMISSIONS.includes(item) &&
                    // Chấm recap chỉ có ở nhóm MTE
                    (item !== RolePermission.SCORE_RECAP ||
                        kind === GroupKind.MENTEE),
            );
            if (!groupPerms.length && source !== "GROUP") return;
            const existing = result.get(group._id);
            const roleKey = LEADER_CODES.includes(role.code)
                ? "LEADER"
                : DEPUTY_CODES.includes(role.code)
                  ? "DEPUTY"
                  : role.code;
            const delegatedFrom = { ...(existing?.delegatedFrom ?? {}) };
            for (const item of groupPerms) {
                if (source === "DELEGATION" && delegator) {
                    if (!existing?.permissions.includes(item))
                        delegatedFrom[item] = delegator;
                } else delete delegatedFrom[item];
            }
            const merged = [
                ...new Set([...(existing?.permissions ?? []), ...groupPerms]),
            ];
            result.set(group._id, {
                _id: group._id,
                code: group.code,
                name: group.name,
                role:
                    existing && existing.role === "LEADER"
                        ? "LEADER"
                        : (existing?.role ?? roleKey),
                roleCode: existing?.roleCode ?? role.code,
                roleName: existing
                    ? existing.roleName.includes(role.name)
                        ? existing.roleName
                        : `${existing.roleName}, ${role.name}`
                    : role.name,
                groupKind: kind,
                permissions: merged,
                canReview:
                    merged.includes(RolePermission.SCORE_RECAP) ||
                    merged.includes(RolePermission.REVIEW_FUND),
                ...(Object.keys(delegatedFrom).length && { delegatedFrom }),
                source:
                    existing?.source === "GROUP" || source === "GROUP"
                        ? "GROUP"
                        : (existing?.source ?? source),
            });
        };
        for (const holder of holders) {
            const group = groups.get(holder.departmentId);
            const permissions = (holder.position.permissions ?? []) as string[];
            if (group) {
                const kind = group.groupKind ?? GroupKind.MENTEE;
                // Vai trò phải thuộc đúng loại nhóm
                if (
                    holder.position.groupKind &&
                    holder.position.groupKind !== kind
                )
                    continue;
                merge(group, holder.position, permissions, "GROUP");
                continue;
            }
            // Vai trò cấp ban
            const kinds = new Set<string>(
                (holder.position.scopeKinds ?? []) as string[],
            );
            let perms = permissions;
            if (holder.position.adminScope === AdminScope.MENTEE) {
                kinds.add(GroupKind.MENTEE);
                perms = [...new Set([...perms, ...GROUP_PERMISSIONS])];
            }
            if (!kinds.size) continue;
            for (const group of allGroups)
                if (kinds.has(group.groupKind ?? GroupKind.MENTEE))
                    merge(group, holder.position, perms, "BAN");
        }
        if (includeDelegations) {
            const today = this.today();
            const delegations = await this.delegationModel.findAll({
                where: {
                    toMemberId: memberId,
                    revokedAt: null,
                    startDate: { [Op.lte]: today },
                    endDate: { [Op.gte]: today },
                },
                raw: true,
            });
            for (const row of delegations) {
                const group = groups.get(row.groupId);
                if (!group) continue;
                // Chỉ trong phạm vi quyền hiện có của người ủy quyền ở nhóm đó (không ủy quyền lại)
                const own = (
                    await this.leadershipOf(row.fromMemberId, false)
                ).find((item) => item._id === row.groupId);
                if (!own) continue;
                const from = await this.memberModel.findByPk(row.fromMemberId, {
                    raw: true,
                });
                merge(
                    group,
                    { code: "DELEGATE", name: "Được ủy quyền" },
                    (row.permissions ?? []).filter((item) =>
                        own.permissions.includes(item),
                    ),
                    "DELEGATION",
                    {
                        memberId: row.fromMemberId,
                        name: from?.fullName ?? row.fromMemberId,
                    },
                );
            }
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

    /**
     * Quyền tổng hợp: phạm vi quản trị (cấp trực tiếp hoặc từ chức vụ, kèm phạm vi bao hàm) và hành động
     * cấp hệ thống (từ chức vụ).
     * - Trưởng ban HLC Fund (phạm vi FUND) và quyền POINT cấp trực tiếp: toàn quyền thu chi (chốt kỳ, sửa điểm,
     *   xem bảng chi trả, xác nhận đã chi).
     * - Trưởng ban MTE chỉ XEM bảng điểm phụ cấp; muốn sửa điểm phải gửi đề xuất cho Trưởng ban HLC Fund.
     */
    async capabilities(user: Pick<User, "_id" | "systemRole">) {
        const all = Object.values(AdminScope) as string[];
        if (user.systemRole === SystemRole.ADMIN)
            return {
                superAdmin: true,
                memberId: null,
                scopes: new Set(all),
                actions: new Set(GLOBAL_PERMISSIONS),
                moduleIds: null,
            } as Capabilities;
        const grants = await this.permissionModel.findAll({
            where: { userId: user._id },
            raw: true,
        });
        const member = await this.memberOfUser(user);
        const holders = member
            ? await this.activeHolders({ memberId: member._id })
            : [];
        const scopes = new Set<string>([
            ...grants.map((row) => row.scope as string),
            ...holders.map((row) => row.position.adminScope).filter(Boolean),
        ]);
        for (const scope of [...scopes])
            for (const implied of SCOPE_IMPLIES[scope] ?? [])
                scopes.add(implied);
        const actions = new Set<string>(
            holders.flatMap((row) =>
                ((row.position.permissions ?? []) as string[]).filter((item) =>
                    GLOBAL_PERMISSIONS.includes(item),
                ),
            ),
        );
        const directScopes = new Set<string>([
            ...grants.map((row) => row.scope as string),
            ...holders.map((row) => row.position.adminScope).filter(Boolean),
        ]);
        // Toàn quyền thu chi: Trưởng ban HLC Fund và Admin điểm (cấp trực tiếp)
        if (
            directScopes.has(AdminScope.FUND) ||
            directScopes.has(AdminScope.POINT)
        )
            for (const item of [
                RolePermission.LOCK_PERIOD,
                RolePermission.EDIT_POINTS,
                RolePermission.VIEW_PAYOUT,
                RolePermission.CONFIRM_PAYOUT,
            ])
                actions.add(item);
        // Trưởng ban MTE: xem bảng điểm phụ cấp để đề xuất, không tự sửa / chốt
        if (scopes.has(AdminScope.MENTEE))
            actions.add(RolePermission.VIEW_PAYOUT);
        // Có quyền thao tác trên bảng phụ cấp thì vào được màn hình điểm phụ cấp
        if (
            actions.has(RolePermission.CONFIRM_PAYOUT) ||
            actions.has(RolePermission.LOCK_PERIOD) ||
            actions.has(RolePermission.EDIT_POINTS) ||
            actions.has(RolePermission.VIEW_PAYOUT)
        )
            scopes.add(AdminScope.POINT);
        const moduleIds = scopes.has(AdminScope.LEARNING)
            ? null
            : [
                  ...new Set([
                      ...grants
                          .filter(
                              (row) => row.scope === AdminScope.LEARNING_MODULE,
                          )
                          .map((row) => row.moduleId),
                      ...holders
                          .filter(
                              (row) =>
                                  row.position.adminScope ===
                                  AdminScope.LEARNING_MODULE,
                          )
                          .map((row) => row.position.moduleId),
                  ]),
              ].filter(Boolean);
        // Admin module học tập nhỏ vào được màn hình học tập
        if (moduleIds?.length) scopes.add(AdminScope.LEARNING_MODULE);
        return {
            superAdmin: false,
            memberId: member?._id ?? null,
            scopes,
            actions,
            moduleIds,
        } as Capabilities;
    }

    async can(user: User, action: RolePermission | string) {
        return (await this.capabilities(user)).actions.has(action);
    }

    async assertCan(user: User, action: RolePermission | string) {
        if (!(await this.can(user, action)))
            throw ApiError.Forbidden("error-action-forbidden");
    }

    /** Chỉ Admin toàn cục (xóa nhóm, xóa vai trò, mở khóa kỳ, nhập dữ liệu quý cũ) */
    assertSuperAdmin(user: Pick<User, "systemRole">) {
        if (user.systemRole !== SystemRole.ADMIN)
            throw ApiError.Forbidden("error-super-admin-only");
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
        return {
            isAdmin: false,
            memberId: member._id,
            groupIds,
            memberIds,
            groups,
        };
    }
}
