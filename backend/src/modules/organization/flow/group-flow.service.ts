import { ApiError } from "@config/exception/api-error";
import { MemberStatus, MemberType } from "@module/member/common/constant";
import { MemberModel } from "@module/member/models/member.model";
import { User } from "@module/user/entities/user.entity";
import { SystemRole } from "@module/user/common/constant";
import { AdminScope } from "@module/permission/common/constant";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Op, Transaction } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import { DepartmentType, GroupKind } from "../common/constant";
import { DepartmentModel } from "../models/department.model";
import { GroupMembershipModel } from "../models/group-membership.model";
import { MemberPositionModel } from "../models/member-position.model";
import { PositionModel } from "../models/position.model";
import { GroupDto } from "./dto/group.dto";
import { GroupAccessService } from "./group-access.service";
import { ActivityLogService } from "@module/activity-log/activity-log.service";
import { FundContributorModel } from "@module/fund/models/fund-contributor.model";
import { FundContributionModel } from "@module/fund/models/fund-contribution.model";
import { ModuleAudienceModel } from "@module/learning/models/module-audience.model";
import { PeriodModel } from "@module/period/models/period.model";
import { PeriodStatus } from "@module/period/common/constant";
import { PointEntryModel } from "@module/point/models/point-entry.model";
import { PointSourceType } from "@module/point/common/constant";
import { GroupDelegationModel } from "../models/group-delegation.model";

const LOCKED_STATUSES = [
    PeriodStatus.LOCKED,
    PeriodStatus.EXPORTED,
    PeriodStatus.PAID,
];

const memberBrief = (member?: {
    _id: string;
    memberCode: string;
    fullName: string;
    memberType: string;
    status?: string;
    phone?: string;
    email?: string;
}) =>
    member
        ? {
              _id: member._id,
              memberCode: member.memberCode,
              fullName: member.fullName,
              memberType: member.memberType,
              status: member.status,
              phone: member.phone ?? null,
              email: member.email ?? null,
          }
        : null;

/** Admin chia nhóm: mỗi nhóm 1 Leader + 1 Phó nhóm (mentee), lưu lịch sử chuyển nhóm và đổi Leader */
@Injectable()
export class GroupFlowService {
    constructor(
        private readonly sequelize: Sequelize,
        private readonly access: GroupAccessService,
        @InjectModel(DepartmentModel)
        private readonly departmentModel: typeof DepartmentModel,
        @InjectModel(MemberPositionModel)
        private readonly memberPositionModel: typeof MemberPositionModel,
        @InjectModel(PositionModel)
        private readonly positionModel: typeof PositionModel,
        @InjectModel(GroupMembershipModel)
        private readonly membershipModel: typeof GroupMembershipModel,
        @InjectModel(MemberModel)
        private readonly memberModel: typeof MemberModel,
        private readonly activityLog: ActivityLogService,
        @InjectModel(FundContributorModel)
        private readonly contributorModel: typeof FundContributorModel,
        @InjectModel(FundContributionModel)
        private readonly contributionModel: typeof FundContributionModel,
        @InjectModel(ModuleAudienceModel)
        private readonly audienceModel: typeof ModuleAudienceModel,
        @InjectModel(PeriodModel)
        private readonly periodModel: typeof PeriodModel,
        @InjectModel(PointEntryModel)
        private readonly entryModel: typeof PointEntryModel,
        @InjectModel(GroupDelegationModel)
        private readonly delegationModel: typeof GroupDelegationModel,
    ) {}

    private async getGroup(id: string, t?: Transaction) {
        const group = await this.departmentModel.findOne({
            where: { _id: id, type: DepartmentType.GROUP },
            raw: true,
            transaction: t,
        });
        if (!group) throw ApiError.NotFound("error-group-not-found");
        return group;
    }

    /** Admin tổng: mọi nhóm; Trưởng ban MTE: chỉ nhóm MTE */
    async assertManage(user: User, kind?: string | null) {
        if (user.systemRole === SystemRole.ADMIN) return;
        if ((kind ?? GroupKind.MENTEE) !== GroupKind.MENTEE)
            throw ApiError.Forbidden("error-action-forbidden");
        if (
            !(await this.access.capabilities(user)).scopes.has(
                AdminScope.MENTEE,
            )
        )
            throw ApiError.Forbidden("error-action-forbidden");
    }

    async assertManageGroup(user: User, groupId: string) {
        if (user.systemRole === SystemRole.ADMIN) return;
        const group = await this.getGroup(groupId);
        await this.assertManage(user, group.groupKind);
    }

    async assertManageAssignment(user: User, assignmentId: string) {
        if (user.systemRole === SystemRole.ADMIN) return;
        const row = await this.memberPositionModel.findByPk(assignmentId, {
            raw: true,
        });
        if (!row) throw ApiError.NotFound("error-record-not-found");
        await this.assertManageGroup(user, row.departmentId);
    }

    async listFor(user: User) {
        const groups = await this.list();
        return user.systemRole === SystemRole.ADMIN
            ? groups
            : groups.filter(
                  (group) =>
                      (group.groupKind ?? GroupKind.MENTEE) ===
                      GroupKind.MENTEE,
              );
    }

    async list(includeInactive = true) {
        const groups = await this.access.groups(includeInactive);
        const ids = groups.map((group) => group._id);
        const leaders = await this.access.leadersOf(ids);
        const memberships = await this.access.currentMemberships(ids);
        const members = new Map(
            (
                await this.memberModel.findAll({
                    where: {
                        _id: [
                            ...memberships.map((row) => row.memberId),
                            ...[...leaders.values()].flatMap((item) => [
                                item.leaderId,
                                item.deputyId,
                            ]),
                        ].filter(Boolean),
                    },
                    raw: true,
                })
            ).map((member) => [member._id, member]),
        );
        // Vai trò đang / sắp có hiệu lực của từng nhóm (kèm thời hạn)
        const today = this.access.today();
        const assignments = ids.length
            ? await this.memberPositionModel.findAll({
                  where: {
                      departmentId: ids,
                      [Op.or]: [
                          { endDate: null },
                          { endDate: { [Op.gte]: today } },
                      ],
                  },
                  order: [["startDate", "ASC"]],
                  raw: true,
              })
            : [];
        const positions = new Map(
            (await this.positionModel.findAll({ raw: true })).map((item) => [
                item._id,
                item,
            ]),
        );
        const assignees = new Map(
            (assignments.length
                ? await this.memberModel.findAll({
                      where: {
                          _id: [
                              ...new Set(
                                  assignments.map((row) => row.memberId),
                              ),
                          ],
                      },
                      raw: true,
                  })
                : []
            ).map((member) => [member._id, member]),
        );
        return groups.map((group) => {
            const roles = leaders.get(group._id);
            const list = memberships
                .filter((row) => row.groupId === group._id)
                .map((row) => ({
                    ...memberBrief(members.get(row.memberId)),
                    joinedGroupAt: row.startDate,
                }))
                .filter((item) => item._id)
                .sort((a, b) => a.memberCode.localeCompare(b.memberCode));
            return {
                ...group,
                roles: assignments
                    .filter((row) => row.departmentId === group._id)
                    .map((row) => ({
                        assignmentId: row._id,
                        memberId: row.memberId,
                        fullName: assignees.get(row.memberId)?.fullName ?? "",
                        memberCode:
                            assignees.get(row.memberId)?.memberCode ?? "",
                        positionId: row.positionId,
                        roleCode: positions.get(row.positionId)?.code ?? "",
                        roleName: positions.get(row.positionId)?.name ?? "",
                        startDate: row.startDate,
                        endDate: row.endDate ?? null,
                        isActive: row.startDate <= today,
                    })),
                leader: memberBrief(members.get(roles?.leaderId)),
                deputy: memberBrief(members.get(roles?.deputyId)),
                members: list,
                counts: {
                    mentors: list.filter(
                        (item) => item.memberType === MemberType.MENTOR,
                    ).length,
                    mentees: list.filter(
                        (item) => item.memberType === MemberType.MENTEE,
                    ).length,
                },
            };
        });
    }

    /** Thành viên đang hoạt động chưa thuộc nhóm nào */
    async unassigned() {
        // Mentee cần 1 nhóm MTE, MTO cần 1 nhóm HLC Fund
        const groups = new Map(
            (await this.access.groups(true)).map((group) => [group._id, group]),
        );
        const assigned = new Set(
            (await this.access.currentMemberships()).map(
                (row) =>
                    `${row.memberId}:${groups.get(row.groupId)?.groupKind ?? GroupKind.MENTEE}`,
            ),
        );
        const members = await this.memberModel.findAll({
            where: { status: { [Op.ne]: MemberStatus.INACTIVE } },
            order: [["memberCode", "ASC"]],
            raw: true,
        });
        return members
            .filter(
                (member) =>
                    !assigned.has(
                        `${member._id}:${member.memberType === MemberType.MENTOR ? GroupKind.FUND : GroupKind.MENTEE}`,
                    ),
            )
            .map((member) => memberBrief(member));
    }

    private async nextCode(t: Transaction) {
        const rows = await this.departmentModel.findAll({
            where: { code: { [Op.like]: "NHOM_%" } },
            attributes: ["code"],
            raw: true,
            transaction: t,
        });
        const max = rows.reduce(
            (value, row) => Math.max(value, Number(row.code.slice(5)) || 0),
            0,
        );
        return `NHOM_${String(max + 1).padStart(2, "0")}`;
    }

    async create(dto: GroupDto) {
        const id = await this.sequelize.transaction(async (t) => {
            const group = await this.departmentModel.create(
                {
                    code: await this.nextCode(t),
                    name: dto.name.trim(),
                    type: DepartmentType.GROUP,
                    groupKind: dto.groupKind ?? GroupKind.MENTEE,
                    deputyCanReview: dto.deputyCanReview ?? true,
                    isActive: dto.isActive ?? true,
                },
                { transaction: t },
            );
            return group._id;
        });
        return (await this.list()).find((group) => group._id === id);
    }

    async update(id: string, dto: Partial<GroupDto>) {
        await this.getGroup(id);
        await this.departmentModel.update(
            {
                ...(dto.name !== undefined && { name: dto.name.trim() }),
                ...(dto.deputyCanReview !== undefined && {
                    deputyCanReview: dto.deputyCanReview,
                }),
                ...(dto.isActive !== undefined && { isActive: dto.isActive }),
            },
            { where: { _id: id } },
        );
        return (await this.list()).find((group) => group._id === id);
    }

    /** Kết thúc chức Leader/Phó (giữ lịch sử) */
    private async endRole(
        groupId: string,
        positionId: string,
        user: User,
        t: Transaction,
        note?: string,
    ) {
        const today = this.access.today();
        const rows = await this.memberPositionModel.findAll({
            where: { departmentId: groupId, positionId, endDate: null },
            transaction: t,
        });
        for (const row of rows) {
            await row.update(
                {
                    endDate: today,
                    note: [row.note, note].filter(Boolean).join(" · ") || null,
                },
                { transaction: t },
            );
        }
    }

    /** Chuyển thành viên vào nhóm (kết thúc nhóm cũ, gỡ chức Leader/Phó ở nhóm cũ) */
    private async moveMember(
        groupId: string,
        memberId: string,
        user: User,
        t: Transaction,
        note?: string,
    ) {
        const today = this.access.today();
        // Mỗi người thuộc tối đa 1 nhóm của mỗi loại (nhóm MTE / nhóm HLC Fund)
        const target = await this.getGroup(groupId, t);
        const sameKind = await this.departmentModel.findAll({
            where: {
                type: DepartmentType.GROUP,
                groupKind: target.groupKind ?? GroupKind.MENTEE,
            },
            attributes: ["_id"],
            raw: true,
            transaction: t,
        });
        const current = await this.membershipModel.findOne({
            where: {
                memberId,
                endDate: null,
                groupId: sameKind.map((item) => item._id),
            },
            transaction: t,
        });
        if (current?.groupId === groupId) return false;
        if (current) {
            await current.update({ endDate: today }, { transaction: t });
            // Rời nhóm cũ: kết thúc mọi vai trò đang giữ ở nhóm đó
            const roles = await this.memberPositionModel.findAll({
                where: {
                    memberId,
                    departmentId: current.groupId,
                    endDate: null,
                },
                transaction: t,
            });
            for (const role of roles)
                await role.update(
                    { endDate: today, note: "Chuyển sang nhóm khác" },
                    { transaction: t },
                );
        }
        await this.membershipModel.create(
            {
                groupId,
                memberId,
                startDate: today,
                changedBy: user._id,
                note: note ?? null,
            },
            { transaction: t },
        );
        return true;
    }

    async addMembers(
        groupId: string,
        memberIds: string[],
        user: User,
        note?: string,
    ) {
        await this.getGroup(groupId);
        const members = await this.memberModel.findAll({
            where: { _id: memberIds },
            raw: true,
        });
        if (members.length !== new Set(memberIds).size)
            throw ApiError.NotFound("error-record-not-found");
        // Nhóm MTE gồm mentee; nhóm HLC Fund gồm MTO (Leader/Phó nhóm Fund là MTE nhưng không đóng quỹ trong nhóm)
        const group = await this.getGroup(groupId);
        const expected =
            group.groupKind === GroupKind.FUND
                ? MemberType.MENTOR
                : MemberType.MENTEE;
        const wrong = members.find((member) => member.memberType !== expected);
        if (wrong)
            throw ApiError.BadRequest("error-group-member-type", {
                name: wrong.fullName,
            });
        let moved = 0;
        await this.sequelize.transaction(async (t) => {
            for (const member of members)
                if (await this.moveMember(groupId, member._id, user, t, note))
                    moved += 1;
        });
        return {
            moved,
            group: (await this.list()).find((group) => group._id === groupId),
        };
    }

    /**
     * Rời nhóm không sang nhóm khác: chỉ cho thành viên đã ngừng hoạt động (mỗi thành viên đang hoạt động
     * bắt buộc thuộc 1 nhóm - dùng chuyển nhóm thay vì gỡ khỏi nhóm).
     */
    async removeMember(groupId: string, memberId: string, user?: User) {
        const today = this.access.today();
        const member = await this.memberModel.findByPk(memberId, { raw: true });
        if (!member) throw ApiError.NotFound("error-record-not-found");
        if (member.status !== MemberStatus.INACTIVE)
            throw ApiError.BadRequest("error-member-needs-group", {
                name: member.fullName,
            });
        const group = await this.getGroup(groupId);
        await this.activityLog.log(user ?? null, {
            module: "ORGANIZATION",
            action: "GROUP_MEMBER_REMOVE",
            targetId: groupId,
            targetName: group.name,
            summary: `Gỡ ${member.fullName} (đã ngừng hoạt động) khỏi ${group.name}`,
        });
        await this.sequelize.transaction(async (t) => {
            const current = await this.membershipModel.findOne({
                where: { groupId, memberId, endDate: null },
                transaction: t,
            });
            if (!current) throw ApiError.NotFound("error-record-not-found");
            await current.update({ endDate: today }, { transaction: t });
            await this.memberPositionModel.update(
                { endDate: today, note: "Rời nhóm" },
                {
                    where: {
                        memberId,
                        departmentId: groupId,
                        endDate: null,
                    },
                    transaction: t,
                },
            );
        });
        return (await this.list()).find((group) => group._id === groupId);
    }

    /** Đặt / đổi / gỡ Leader hoặc Phó nhóm. Người mới phải là mentee, tự động vào nhóm nếu chưa ở */
    async setRole(
        groupId: string,
        role: "LEADER" | "DEPUTY",
        memberId: string | undefined,
        user: User,
    ) {
        const target = await this.getGroup(groupId);
        const ids = await this.access.positionIds(
            target.groupKind ?? GroupKind.MENTEE,
        );
        const positionId = role === "LEADER" ? ids.leader : ids.deputy;
        const otherId = role === "LEADER" ? ids.deputy : ids.leader;
        if (!positionId) throw ApiError.NotFound("error-record-not-found");
        await this.sequelize.transaction(async (t) => {
            if (memberId) {
                const member = await this.memberModel.findByPk(memberId, {
                    raw: true,
                    transaction: t,
                });
                if (!member) throw ApiError.NotFound("error-record-not-found");
                if (member.memberType !== MemberType.MENTEE)
                    throw ApiError.BadRequest("error-group-leader-mentee-only");
                const current = await this.memberPositionModel.findOne({
                    where: { departmentId: groupId, positionId, endDate: null },
                    raw: true,
                    transaction: t,
                });
                if (current?.memberId === memberId) return;
                await this.endRole(groupId, positionId, user, t, "Thay người");
                // Một người không giữ cả 2 vai trò trong nhóm
                await this.memberPositionModel.update(
                    {
                        endDate: this.access.today(),
                        note: "Chuyển vai trò trong nhóm",
                    },
                    {
                        where: {
                            departmentId: groupId,
                            positionId: otherId,
                            memberId,
                            endDate: null,
                        },
                        transaction: t,
                    },
                );
                const group = await this.getGroup(groupId, t);
                // Nhóm HLC Fund: Leader/Phó chỉ quản lý, không là thành viên đóng quỹ
                if (group.groupKind !== GroupKind.FUND) {
                    await this.moveMember(
                        groupId,
                        memberId,
                        user,
                        t,
                        role === "LEADER" ? "Làm Leader" : "Làm Phó nhóm",
                    );
                }
                await this.memberPositionModel.create(
                    {
                        memberId,
                        departmentId: groupId,
                        positionId,
                        startDate: this.access.today(),
                        note: `Giao bởi ${user.username ?? user._id}`,
                    },
                    { transaction: t },
                );
            } else {
                await this.endRole(groupId, positionId, user, t, "Gỡ vai trò");
            }
        });
        return (await this.list()).find((group) => group._id === groupId);
    }

    /**
     * Gán vai trò (Leader, Phó nhóm hoặc vai trò khác cùng loại nhóm) cho thành viên trong 1 nhóm,
     * có thời gian hiệu lực. Người đang giữ vai trò đó được kết thúc từ ngày bàn giao.
     */
    async assignRole(
        groupId: string,
        dto: {
            memberId: string;
            positionId: string;
            startDate?: string;
            endDate?: string;
            note?: string;
        },
        user: User,
    ) {
        const group = await this.getGroup(groupId);
        const kind = group.groupKind ?? GroupKind.MENTEE;
        const position = await this.positionModel.findByPk(dto.positionId, {
            raw: true,
        });
        if (!position || position.isActive === false)
            throw ApiError.NotFound("error-record-not-found");
        if (position.groupKind !== kind)
            throw ApiError.BadRequest("error-role-kind-mismatch", {
                role: position.name,
            });
        const member = await this.memberModel.findByPk(dto.memberId, {
            raw: true,
        });
        if (!member) throw ApiError.NotFound("error-record-not-found");
        if (member.memberType !== MemberType.MENTEE)
            throw ApiError.BadRequest("error-group-leader-mentee-only");
        const startDate = dto.startDate || this.access.today();
        if (dto.endDate && dto.endDate < startDate)
            throw ApiError.BadRequest("error-member-position-invalid");
        await this.sequelize.transaction(async (t) => {
            // Bàn giao: người đang giữ vai trò này kết thúc trước ngày bắt đầu mới
            const previous = await this.memberPositionModel.findAll({
                where: {
                    departmentId: groupId,
                    positionId: position._id,
                    [Op.or]: [
                        { endDate: null },
                        { endDate: { [Op.gte]: startDate } },
                    ],
                },
                transaction: t,
            });
            for (const row of previous) {
                const dayBefore = new Date(
                    new Date(`${startDate}T00:00:00Z`).getTime() - 86400000,
                )
                    .toISOString()
                    .slice(0, 10);
                await row.update(
                    {
                        endDate:
                            row.startDate > dayBefore ? startDate : dayBefore,
                        note: [row.note, "Bàn giao vai trò"]
                            .filter(Boolean)
                            .join(" · "),
                    },
                    { transaction: t },
                );
            }
            // Nhóm MTE: người giữ vai trò cũng là thành viên nhóm; nhóm HLC Fund: chỉ quản lý
            if (kind !== GroupKind.FUND)
                await this.moveMember(
                    groupId,
                    member._id,
                    user,
                    t,
                    `Giữ vai trò ${position.name}`,
                );
            await this.memberPositionModel.create(
                {
                    memberId: member._id,
                    departmentId: groupId,
                    positionId: position._id,
                    startDate,
                    endDate: dto.endDate || null,
                    note:
                        dto.note?.trim() ||
                        `Giao bởi ${user.username ?? user._id}`,
                },
                { transaction: t },
            );
        });
        await this.activityLog.log(user, {
            module: "ROLE",
            action: "ASSIGNMENT_CREATE",
            targetId: groupId,
            targetName: group.name,
            summary: `Gán vai trò ${position.name} cho ${member.fullName} tại ${group.name} từ ${startDate.split("-").reverse().join("/")}${dto.endDate ? ` đến ${dto.endDate.split("-").reverse().join("/")}` : ""}`,
        });
        return (await this.list()).find((item) => item._id === groupId);
    }

    /**
     * Gỡ chức vụ: ghi ngày kết thúc hiệu lực (không xóa bản ghi) để phụ cấp của kỳ đó vẫn tính đúng
     * theo thời gian giữ chức. Có nhật ký.
     */
    async endAssignment(
        assignmentId: string,
        endDate?: string,
        user?: User,
        reason?: string,
    ) {
        const row = await this.memberPositionModel.findByPk(assignmentId);
        if (!row) throw ApiError.NotFound("error-record-not-found");
        const value = endDate || this.access.today();
        if (value < row.startDate)
            throw ApiError.BadRequest("error-member-position-invalid");
        const before = row.endDate ?? null;
        await row.update({
            endDate: value,
            ...(reason?.trim() && {
                note: [row.note, `Gỡ: ${reason.trim()}`]
                    .filter(Boolean)
                    .join(" · "),
            }),
        });
        const [member, position, department] = await Promise.all([
            this.memberModel.findByPk(row.memberId, { raw: true }),
            this.positionModel.findByPk(row.positionId, { raw: true }),
            this.departmentModel.findByPk(row.departmentId, { raw: true }),
        ]);
        await this.activityLog.log(user ?? null, {
            module: "ROLE",
            action: "ASSIGNMENT_END",
            targetId: row._id,
            targetName: `${member?.fullName ?? row.memberId} - ${position?.name ?? ""}`,
            summary: `Gỡ chức vụ ${position?.name ?? ""} của ${member?.fullName ?? ""} tại ${department?.name ?? ""}, hiệu lực đến hết ${value.split("-").reverse().join("/")}${reason?.trim() ? ` (lý do: ${reason.trim()})` : ""}`,
            detail: { oldEndDate: before, endDate: value },
        });
        return row.get({ plain: true });
    }

    /** Nhóm có dữ liệu đã chốt (điểm phụ cấp ở kỳ đã chốt / đã chi, khoản quỹ ở kỳ đã chốt) */
    private async finalizedData(groupId: string) {
        const locked = await this.periodModel.findAll({
            where: { status: LOCKED_STATUSES },
            attributes: ["_id"],
            raw: true,
        });
        const periodIds = locked.map((item) => item._id);
        if (!periodIds.length) return { pointEntries: 0, contributions: 0 };
        const assignmentIds = (
            await this.memberPositionModel.findAll({
                where: { departmentId: groupId },
                attributes: ["_id"],
                raw: true,
            })
        ).map((item) => item._id);
        const pointEntries = await this.entryModel.count({
            where: {
                periodId: periodIds,
                [Op.or]: [
                    {
                        sourceType: PointSourceType.GROUP_COMPLETION,
                        sourceId: groupId,
                    },
                    ...(assignmentIds.length
                        ? [
                              {
                                  sourceType: PointSourceType.MEMBER_POSITION,
                                  sourceId: assignmentIds,
                              },
                          ]
                        : []),
                ],
            },
        });
        const contributorIds = (
            await this.contributorModel.findAll({
                where: { groupId },
                attributes: ["_id"],
                raw: true,
            })
        ).map((item) => item._id);
        const contributions = contributorIds.length
            ? await this.contributionModel.count({
                  where: { contributorId: contributorIds, periodId: periodIds },
              })
            : 0;
        return { pointEntries, contributions };
    }

    /** Thông tin trước khi xóa nhóm: số thành viên phải chuyển, dữ liệu liên quan, cách xóa */
    async deletePreview(groupId: string) {
        const group = await this.getGroup(groupId);
        const kind = group.groupKind ?? GroupKind.MENTEE;
        const members = await this.membershipModel.findAll({
            where: { groupId, endDate: null },
            raw: true,
        });
        const memberRows = members.length
            ? await this.memberModel.findAll({
                  where: { _id: members.map((row) => row.memberId) },
                  order: [["memberCode", "ASC"]],
                  raw: true,
              })
            : [];
        const contributors = await this.contributorModel.count({
            where: { groupId, isActive: true },
        });
        const today = this.access.today();
        const [history, roles, activeRoles, audiences, finalized] =
            await Promise.all([
                this.membershipModel.count({ where: { groupId } }),
                this.memberPositionModel.count({
                    where: { departmentId: groupId },
                }),
                this.memberPositionModel.count({
                    where: {
                        departmentId: groupId,
                        [Op.or]: [
                            { endDate: null },
                            { endDate: { [Op.gte]: today } },
                        ],
                    },
                }),
                this.audienceModel.count({ where: { groupId } }),
                this.finalizedData(groupId),
            ]);
        const targets = (await this.access.groups(false, kind as GroupKind))
            .filter((item) => item._id !== groupId)
            .map((item) => ({
                _id: item._id,
                code: item.code,
                name: item.name,
            }));
        const hasFinalized =
            finalized.pointEntries + finalized.contributions > 0;
        return {
            group: {
                _id: group._id,
                code: group.code,
                name: group.name,
                groupKind: kind,
            },
            members: memberRows.map((item) => memberBrief(item)),
            counts: {
                members: members.length,
                contributors,
                membershipHistory: history,
                roleAssignments: roles,
                activeRoles,
                moduleAudiences: audiences,
                finalizedPointEntries: finalized.pointEntries,
                finalizedContributions: finalized.contributions,
            },
            /** Còn thành viên / thầy cô: phải chuyển hết sang nhóm khác trước */
            canDelete: members.length === 0 && contributors === 0,
            /** HARD: xóa hẳn; DEACTIVATE: có dữ liệu đã chốt nên chỉ ngừng hoạt động để giữ lịch sử đối soát */
            mode: hasFinalized ? "DEACTIVATE" : "HARD",
            targets,
        };
    }

    /** Bước 1: chuyển hàng loạt thành viên (và thầy cô của nhóm HLC Fund) sang nhóm khác cùng loại */
    async transferMembers(
        groupId: string,
        dto: { targetGroupId: string; memberIds?: string[]; note?: string },
        user: User,
    ) {
        const group = await this.getGroup(groupId);
        const target = await this.getGroup(dto.targetGroupId).catch(() => {
            throw ApiError.BadRequest("error-group-target-invalid");
        });
        if (
            target._id === group._id ||
            !target.isActive ||
            (target.groupKind ?? GroupKind.MENTEE) !==
                (group.groupKind ?? GroupKind.MENTEE)
        )
            throw ApiError.BadRequest("error-group-target-invalid");
        const current = await this.membershipModel.findAll({
            where: { groupId, endDate: null },
            raw: true,
        });
        const ids = dto.memberIds?.length
            ? current
                  .map((row) => row.memberId)
                  .filter((id) => dto.memberIds.includes(id))
            : current.map((row) => row.memberId);
        let moved = 0;
        let contributors = 0;
        await this.sequelize.transaction(async (t) => {
            for (const memberId of ids)
                if (
                    await this.moveMember(
                        target._id,
                        memberId,
                        user,
                        t,
                        dto.note?.trim() || `Chuyển từ ${group.name}`,
                    )
                )
                    moved += 1;
            // Chuyển hết thì chuyển cả thầy cô ngoài danh sách MTO
            if (!dto.memberIds?.length) {
                const [count] = await this.contributorModel.update(
                    { groupId: target._id },
                    { where: { groupId }, transaction: t },
                );
                contributors = count;
            }
        });
        await this.activityLog.log(user, {
            module: "ORGANIZATION",
            action: "GROUP_TRANSFER",
            targetId: groupId,
            targetName: group.name,
            summary: `Chuyển ${moved} thành viên${contributors ? ` và ${contributors} thầy cô` : ""} từ ${group.name} sang ${target.name}`,
            detail: { targetGroupId: target._id, memberIds: ids },
        });
        return {
            moved,
            contributors,
            preview: await this.deletePreview(groupId),
        };
    }

    /**
     * Bước 2: xóa nhóm đã trống (chỉ Admin toàn cục). Có dữ liệu đã chốt thì chỉ chuyển sang
     * ngừng hoạt động (kết thúc mọi vai trò, ủy quyền) để giữ lịch sử đối soát.
     */
    async deleteGroup(groupId: string, user: User, reason?: string) {
        this.access.assertSuperAdmin(user);
        const preview = await this.deletePreview(groupId);
        if (!preview.canDelete)
            throw ApiError.BadRequest("error-group-not-empty", {
                count: preview.counts.members + preview.counts.contributors,
            });
        const today = this.access.today();
        await this.sequelize.transaction(async (t) => {
            if (preview.mode === "DEACTIVATE") {
                await this.memberPositionModel.update(
                    { endDate: today, note: "Nhóm ngừng hoạt động" },
                    {
                        where: {
                            departmentId: groupId,
                            [Op.or]: [
                                { endDate: null },
                                { endDate: { [Op.gt]: today } },
                            ],
                        },
                        transaction: t,
                    },
                );
                await this.delegationModel.update(
                    { revokedAt: new Date(), revokedBy: user._id },
                    { where: { groupId, revokedAt: null }, transaction: t },
                );
                await this.departmentModel.update(
                    { isActive: false },
                    { where: { _id: groupId }, transaction: t },
                );
                return;
            }
            await this.audienceModel.destroy({
                where: { groupId },
                transaction: t,
            });
            await this.delegationModel.destroy({
                where: { groupId },
                transaction: t,
            });
            await this.memberPositionModel.destroy({
                where: { departmentId: groupId },
                transaction: t,
            });
            await this.membershipModel.destroy({
                where: { groupId },
                transaction: t,
            });
            await this.contributorModel.destroy({
                where: { groupId },
                transaction: t,
            });
            await this.departmentModel.destroy({
                where: { _id: groupId },
                transaction: t,
            });
        });
        await this.activityLog.log(user, {
            module: "ORGANIZATION",
            action:
                preview.mode === "DEACTIVATE"
                    ? "GROUP_DEACTIVATE"
                    : "GROUP_DELETE",
            targetId: groupId,
            targetName: preview.group.name,
            summary:
                preview.mode === "DEACTIVATE"
                    ? `Ngừng hoạt động ${preview.group.name} (có ${preview.counts.finalizedPointEntries} dòng điểm và ${preview.counts.finalizedContributions} khoản quỹ đã chốt, giữ lịch sử đối soát)${reason?.trim() ? `. Lý do: ${reason.trim()}` : ""}`
                    : `Xóa ${preview.group.name} (${preview.counts.membershipHistory} lịch sử thành viên, ${preview.counts.roleAssignments} lần giữ vai trò)${reason?.trim() ? `. Lý do: ${reason.trim()}` : ""}`,
            detail: preview.counts,
        });
        return { mode: preview.mode, group: preview.group };
    }

    /** Lịch sử thành viên và Leader/Phó của nhóm */
    async history(groupId: string) {
        await this.getGroup(groupId);
        const positions = new Map(
            (await this.positionModel.findAll({ raw: true })).map((item) => [
                item._id,
                item,
            ]),
        );
        const memberships = await this.membershipModel.findAll({
            where: { groupId },
            order: [["createdAt", "DESC"]],
            raw: true,
        });
        const roles = await this.memberPositionModel.findAll({
            where: { departmentId: groupId },
            order: [["createdAt", "DESC"]],
            raw: true,
        });
        const members = new Map(
            (
                await this.memberModel.findAll({
                    where: {
                        _id: [
                            ...memberships.map((row) => row.memberId),
                            ...roles.map((row) => row.memberId),
                        ],
                    },
                    raw: true,
                })
            ).map((member) => [member._id, member]),
        );
        return {
            memberships: memberships.map((row) => ({
                ...row,
                member: memberBrief(members.get(row.memberId)),
            })),
            roles: roles.map((row) => ({
                ...row,
                role: positions.get(row.positionId)?.code ?? "",
                roleName: positions.get(row.positionId)?.name ?? "",
                member: memberBrief(members.get(row.memberId)),
            })),
        };
    }
}
