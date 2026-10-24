import { ApiError } from "@config/exception/api-error";
import { ActivityLogService } from "@module/activity-log/activity-log.service";
import { MemberModel } from "@module/member/models/member.model";
import { GroupKind } from "@module/organization/common/constant";
import {
    GroupAccessService,
    KIND_ROLE_CODES,
} from "@module/organization/flow/group-access.service";
import { DepartmentModel } from "@module/organization/models/department.model";
import { AdminScope } from "@module/permission/common/constant";
import { SystemRole } from "@module/user/common/constant";
import { User } from "@module/user/entities/user.entity";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { MentoringPairModel } from "../models/mentoring-pair.model";
import { RecapDelegationModel } from "../models/recap-delegation.model";
import { RecapDelegationDto } from "./dto/recap-delegation.dto";

export type RecapAction = "REVIEW" | "PROXY";

export interface RecapAuthorization {
    /** Có khi làm thay theo ủy quyền: ghi nhật ký "làm thay cho ai, theo ủy quyền của ai" */
    behalf?: { memberId: string; name: string };
    delegationId?: string;
    /** PAIR / GROUP khi làm thay theo ủy quyền */
    scopeType?: string;
}

const LEADER_ROLE_CODES = Object.values(KIND_ROLE_CODES).flatMap((item) => [
    item.leader,
    item.deputy,
]);

/**
 * Quyền với recap MTO (vòng 6):
 * - Mặc định chỉ Admin toàn cục và Trưởng ban Mentoring được duyệt / không duyệt và nộp hộ.
 * - MTE trong cặp, Leader (Phó) nhóm của MTE đó và Trưởng ban MTE chỉ làm được khi Trưởng ban Mentoring ủy quyền
 *   (có phạm vi cặp hoặc nhóm, thời hạn, lý do; hết hạn tự mất hiệu lực).
 * - Xem recap MTO: MTE trong cặp và Leader nhóm xem mặc định, không cần ủy quyền.
 */
@Injectable()
export class RecapAccessService {
    constructor(
        private readonly groupAccess: GroupAccessService,
        private readonly activityLog: ActivityLogService,
        @InjectModel(RecapDelegationModel)
        private readonly delegationModel: typeof RecapDelegationModel,
        @InjectModel(MentoringPairModel)
        private readonly pairModel: typeof MentoringPairModel,
        @InjectModel(MemberModel)
        private readonly memberModel: typeof MemberModel,
        @InjectModel(DepartmentModel)
        private readonly departmentModel: typeof DepartmentModel,
    ) {}

    /** Admin toàn cục hoặc Trưởng ban Mentoring (toàn quyền với recap) */
    async isMentoringHead(user: User) {
        if (user.systemRole === SystemRole.ADMIN) return true;
        return (await this.groupAccess.capabilities(user)).scopes.has(
            AdminScope.MENTORING,
        );
    }

    /** Chỉ Admin toàn cục / Trưởng ban Mentoring (không có ủy quyền): nộp hộ recap MTE, duyệt recap MTE */
    async requireHead(user: User) {
        if (!(await this.isMentoringHead(user)))
            throw ApiError.Forbidden("error-recap-action-forbidden");
    }

    private statusOf(row: RecapDelegationModel, today: string) {
        if (row.revokedAt) return "REVOKED";
        if (row.endDate < today) return "EXPIRED";
        if (row.startDate > today) return "UPCOMING";
        return "ACTIVE";
    }

    /** Người nhận có đúng quan hệ với phạm vi ủy quyền không (kiểm tra lúc cấp và lúc dùng) */
    async isEligible(memberId: string, scopeType: string, scopeId: string) {
        if (scopeType === "PAIR") {
            const pair = await this.pairModel.findByPk(scopeId, { raw: true });
            return Boolean(pair && pair.menteeId === memberId);
        }
        if (scopeType !== "GROUP") return false;
        const group = await this.departmentModel.findByPk(scopeId, {
            raw: true,
        });
        if (
            !group ||
            (group.groupKind ?? GroupKind.MENTEE) !== GroupKind.MENTEE
        )
            return false;
        // Trưởng ban MTE quản lý mọi nhóm MTE
        if (
            (await this.groupAccess.adminScopesOf(memberId)).includes(
                AdminScope.MENTEE,
            )
        )
            return true;
        const holders = await this.groupAccess.activeHolders({
            departmentId: [scopeId],
            memberId,
        });
        return holders.some((row) =>
            LEADER_ROLE_CODES.includes(row.position.code),
        );
    }

    /** Ủy quyền còn hiệu lực của người này cho cặp và hành động đó */
    private async findActive(
        memberId: string,
        pair: { _id: string; menteeId: string },
        action: RecapAction,
    ) {
        const today = this.groupAccess.today();
        const rows = await this.delegationModel.findAll({
            where: { toMemberId: memberId },
            raw: true,
        });
        const menteeGroup = await this.groupAccess.groupOfMember(
            pair.menteeId,
            GroupKind.MENTEE,
        );
        for (const row of rows) {
            if (this.statusOf(row as RecapDelegationModel, today) !== "ACTIVE")
                continue;
            if (!(row.actions ?? []).includes(action)) continue;
            const inScope =
                (row.scopeType === "PAIR" && row.scopeId === pair._id) ||
                (row.scopeType === "GROUP" && row.scopeId === menteeGroup);
            if (
                inScope &&
                (await this.isEligible(memberId, row.scopeType, row.scopeId))
            )
                return row;
        }
        return null;
    }

    /**
     * Cho phép duyệt / nộp hộ recap MTO của cặp này, hoặc ném lỗi. Trả thông tin làm thay (nếu theo ủy quyền).
     * Recap MTE: nộp hộ chỉ Admin toàn cục / Trưởng ban Mentoring (không có ủy quyền).
     */
    async authorize(
        user: User,
        pair: { _id: string; menteeId: string },
        action: RecapAction,
    ): Promise<RecapAuthorization> {
        if (await this.isMentoringHead(user)) return {};
        const member = await this.groupAccess.memberOfUser(user);
        const delegation = member
            ? await this.findActive(member._id, pair, action)
            : null;
        if (!delegation)
            throw ApiError.Forbidden("error-recap-action-forbidden");
        const grantor = await this.memberModel.findOne({
            where: { userId: delegation.grantedByUserId },
            raw: true,
        });
        return {
            delegationId: delegation._id,
            scopeType: delegation.scopeType,
            behalf: {
                memberId: grantor?._id ?? delegation.grantedByUserId,
                name: delegation.grantedByName,
            },
        };
    }

    /** Có được làm hành động này với recap MTO của cặp không (không ném lỗi) */
    async can(
        user: User,
        pair: { _id: string; menteeId: string },
        action: RecapAction,
    ) {
        try {
            await this.authorize(user, pair, action);
            return true;
        } catch {
            return false;
        }
    }

    canReview(user: User, pair: { _id: string; menteeId: string }) {
        return this.can(user, pair, "REVIEW");
    }

    async log(
        user: User,
        action: string,
        summary: string,
        target: { id: string; name: string },
        auth: RecapAuthorization,
    ) {
        await this.activityLog.log(user, {
            module: "MENTORING",
            action,
            targetId: target.id,
            targetName: target.name,
            summary: auth.behalf
                ? `${summary} (làm thay cho ${auth.behalf.name}, theo ủy quyền của ${auth.behalf.name})`
                : summary,
            detail: auth.delegationId
                ? { delegationId: auth.delegationId }
                : null,
            onBehalfOf: auth.behalf ?? null,
        });
    }

    // ------------------------------------------------------------------
    // Quản lý ủy quyền (Trưởng ban Mentoring / Admin toàn cục)
    // ------------------------------------------------------------------

    private async views(rows: RecapDelegationModel[]) {
        const today = this.groupAccess.today();
        const pairIds = rows
            .filter((row) => row.scopeType === "PAIR")
            .map((row) => row.scopeId);
        const groupIds = rows
            .filter((row) => row.scopeType === "GROUP")
            .map((row) => row.scopeId);
        const pairs = pairIds.length
            ? await this.pairModel.findAll({
                  where: { _id: pairIds },
                  raw: true,
              })
            : [];
        const groups = groupIds.length
            ? await this.departmentModel.findAll({
                  where: { _id: groupIds },
                  raw: true,
              })
            : [];
        const memberIds = [
            ...new Set([
                ...rows.map((row) => row.toMemberId),
                ...pairs.flatMap((pair) => [pair.mentorId, pair.menteeId]),
            ]),
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
        const brief = (id: string) => {
            const member = members.get(id);
            return member
                ? {
                      _id: member._id,
                      memberCode: member.memberCode,
                      fullName: member.fullName,
                  }
                : null;
        };
        return rows.map((row) => {
            const plain = (
                row.get ? row.get({ plain: true }) : row
            ) as RecapDelegationModel;
            const pair = pairs.find((item) => item._id === row.scopeId);
            const group = groups.find((item) => item._id === row.scopeId);
            return {
                ...plain,
                status: this.statusOf(plain, today),
                to: brief(row.toMemberId),
                scope:
                    row.scopeType === "PAIR"
                        ? {
                              label: pair ? `Cặp ${pair.code}` : "Cặp (đã xóa)",
                              mentor: pair ? brief(pair.mentorId) : null,
                              mentee: pair ? brief(pair.menteeId) : null,
                          }
                        : {
                              label: group
                                  ? `Nhóm ${group.name}`
                                  : "Nhóm (đã xóa)",
                          },
            };
        });
    }

    async list() {
        const rows = await this.delegationModel.findAll({
            order: [["createdAt", "DESC"]],
            limit: 300,
        });
        return this.views(rows);
    }

    /** Ủy quyền dành cho tôi (còn hiệu lực hoặc sắp hiệu lực) */
    async mine(user: User) {
        const member = await this.groupAccess.memberOfUser(user);
        if (!member) return [];
        const rows = await this.delegationModel.findAll({
            where: { toMemberId: member._id, revokedAt: null },
            order: [["createdAt", "DESC"]],
        });
        return (await this.views(rows)).filter((row) =>
            ["ACTIVE", "UPCOMING"].includes(row.status),
        );
    }

    /** Người đủ điều kiện nhận ủy quyền theo phạm vi: MTE trong cặp / Leader (Phó) nhóm + Trưởng ban MTE */
    async eligible(scopeType: string, scopeId: string) {
        const ids = new Set<string>();
        if (scopeType === "PAIR") {
            const pair = await this.pairModel.findByPk(scopeId, { raw: true });
            if (pair) ids.add(pair.menteeId);
        } else if (scopeType === "GROUP") {
            for (const row of await this.groupAccess.activeHolders({
                departmentId: [scopeId],
            }))
                if (LEADER_ROLE_CODES.includes(row.position.code))
                    ids.add(row.memberId);
            for (const row of await this.groupAccess.activeHolders())
                if (row.position.adminScope === AdminScope.MENTEE)
                    ids.add(row.memberId);
        }
        const members = ids.size
            ? await this.memberModel.findAll({
                  where: { _id: [...ids] },
                  raw: true,
              })
            : [];
        return members.map((item) => ({
            _id: item._id,
            memberCode: item.memberCode,
            fullName: item.fullName,
        }));
    }

    async create(user: User, dto: RecapDelegationDto) {
        const today = this.groupAccess.today();
        if (dto.endDate < dto.startDate || dto.endDate < today)
            throw ApiError.BadRequest("error-recap-delegation-invalid");
        const to = await this.memberModel.findByPk(dto.toMemberId, {
            raw: true,
        });
        if (!to || !(await this.isEligible(to._id, dto.scopeType, dto.scopeId)))
            throw ApiError.BadRequest("error-recap-delegation-invalid");
        const row = await this.delegationModel.create({
            toMemberId: to._id,
            scopeType: dto.scopeType,
            scopeId: dto.scopeId,
            actions: [...new Set(dto.actions)],
            startDate: dto.startDate,
            endDate: dto.endDate,
            reason: dto.reason.trim(),
            grantedByUserId: user._id,
            grantedByName: user.fullname || user.username || user._id,
        });
        const [view] = await this.views([row]);
        await this.activityLog.log(user, {
            module: "DELEGATION",
            action: "RECAP_DELEGATION_CREATE",
            targetId: row._id,
            targetName: to.fullName,
            summary: `Ủy quyền ${dto.actions.map((item) => (item === "REVIEW" ? "duyệt" : "nộp hộ")).join(", ")} recap MTO cho ${to.fullName} (${view.scope.label}, ${dto.startDate} → ${dto.endDate}): ${dto.reason.trim()}`,
            detail: {
                scopeType: dto.scopeType,
                scopeId: dto.scopeId,
                actions: dto.actions,
            },
        });
        return view;
    }

    async revoke(user: User, id: string) {
        const row = await this.delegationModel.findByPk(id);
        if (!row) throw ApiError.NotFound("error-recap-delegation-not-found");
        if (!row.revokedAt)
            await row.update({ revokedAt: new Date(), revokedBy: user._id });
        const [view] = await this.views([row]);
        await this.activityLog.log(user, {
            module: "DELEGATION",
            action: "RECAP_DELEGATION_REVOKE",
            targetId: row._id,
            targetName: view.to?.fullName ?? null,
            summary: `Thu hồi ủy quyền recap MTO của ${view.to?.fullName ?? row.toMemberId} (${view.scope.label})`,
        });
        return view;
    }
}
