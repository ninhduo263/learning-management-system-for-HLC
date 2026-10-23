import { ApiError } from "@config/exception/api-error";
import { MemberStatus, MemberType } from "@module/member/common/constant";
import { MemberModel } from "@module/member/models/member.model";
import { User } from "@module/user/entities/user.entity";
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

    async removeMember(groupId: string, memberId: string) {
        const today = this.access.today();
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
        return (await this.list()).find((item) => item._id === groupId);
    }

    /** Kết thúc / sửa thời hạn một lần giữ vai trò */
    async endAssignment(assignmentId: string, endDate?: string) {
        const row = await this.memberPositionModel.findByPk(assignmentId);
        if (!row) throw ApiError.NotFound("error-record-not-found");
        const value = endDate || this.access.today();
        if (value < row.startDate)
            throw ApiError.BadRequest("error-member-position-invalid");
        await row.update({ endDate: value });
        return row.get({ plain: true });
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
