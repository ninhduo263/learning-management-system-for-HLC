import { vnDateKey } from "@common/utils/vn-date.util";
import { ApiError } from "@config/exception/api-error";
import { ActivityLogService } from "@module/activity-log/activity-log.service";
import { UserModel } from "@module/repository/sequelize/model/user.model";
import { TimeService } from "@module/time/time.service";
import { SystemRole } from "@module/user/common/constant";
import { User } from "@module/user/entities/user.entity";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Op } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import { MemberModel } from "../models/member.model";
import { ProfileApproverModel } from "../models/profile-approver.model";
import { ProfileChangeRequestModel } from "../models/profile-change-request.model";
import { maskSensitive } from "./member-admin.service";
import {
    MemberProfileService,
    PROFILE_FIELD_NAME,
} from "./member-profile.service";

/**
 * Duyệt thay đổi hồ sơ nhạy cảm: Admin toàn cục, hoặc người được Admin toàn cục ủy quyền (phạm vi MTE / MTO /
 * tất cả, có thời hạn). Duyệt thay ghi rõ "duyệt thay cho" người đã giao.
 */
@Injectable()
export class ProfileApprovalService {
    constructor(
        private readonly sequelize: Sequelize,
        private readonly timeService: TimeService,
        private readonly profile: MemberProfileService,
        private readonly activityLog: ActivityLogService,
        @InjectModel(ProfileChangeRequestModel)
        private readonly requestModel: typeof ProfileChangeRequestModel,
        @InjectModel(ProfileApproverModel)
        private readonly approverModel: typeof ProfileApproverModel,
        @InjectModel(MemberModel)
        private readonly memberModel: typeof MemberModel,
        @InjectModel(UserModel)
        private readonly userModel: typeof UserModel,
    ) {}

    /** Phạm vi duyệt của người dùng: null = không có quyền; ALL / MENTEE / MENTOR */
    async approverScope(user: User) {
        if (user.systemRole === SystemRole.ADMIN)
            return {
                scopes: new Set(["ALL"]),
                delegations: [] as ProfileApproverModel[],
            };
        const member = await this.memberModel.findOne({
            where: { userId: user._id },
            raw: true,
        });
        if (!member) return null;
        const today = vnDateKey(this.timeService.now());
        const delegations = await this.approverModel.findAll({
            where: {
                memberId: member._id,
                revokedAt: null,
                startDate: { [Op.lte]: today },
                endDate: { [Op.gte]: today },
            },
            raw: true,
        });
        if (!delegations.length) return null;
        return {
            scopes: new Set(delegations.map((row) => row.scope)),
            delegations,
            selfId: member._id,
        };
    }

    private covers(scopes: Set<string>, memberType: string) {
        return scopes.has("ALL") || scopes.has(memberType);
    }

    private async userName(id?: string | null) {
        if (!id) return null;
        const user = await this.userModel.findByPk(id, { raw: true });
        return user ? user.fullname || user.username : null;
    }

    /** Danh sách yêu cầu (mặc định đang chờ duyệt), kèm giá trị cũ / mới */
    async list(user: User, status = "PENDING") {
        const scope = await this.approverScope(user);
        if (!scope)
            throw ApiError.Forbidden("error-profile-approver-forbidden");
        const rows = await this.requestModel.findAll({
            where: status === "ALL" ? {} : { status },
            order: [["createdAt", "DESC"]],
            limit: 300,
            raw: true,
        });
        const members = new Map(
            (rows.length
                ? await this.memberModel.findAll({
                      where: {
                          _id: [...new Set(rows.map((row) => row.memberId))],
                      },
                      raw: true,
                  })
                : []
            ).map((item) => [item._id, item]),
        );
        const names = new Map<string, string | null>();
        for (const id of new Set(
            rows.map((row) => row.decidedBy).filter(Boolean),
        ))
            names.set(id, await this.userName(id));
        return rows
            .filter((row) => {
                const member = members.get(row.memberId);
                return member && this.covers(scope.scopes, member.memberType);
            })
            .map((row) => {
                const member = members.get(row.memberId);
                return {
                    ...row,
                    member: {
                        _id: member._id,
                        memberCode: member.memberCode,
                        fullName: member.fullName,
                        memberType: member.memberType,
                    },
                    decidedByName: names.get(row.decidedBy) ?? null,
                };
            });
    }

    async decide(user: User, id: string, approve: boolean, reason?: string) {
        const scope = await this.approverScope(user);
        if (!scope)
            throw ApiError.Forbidden("error-profile-approver-forbidden");
        const row = await this.requestModel.findByPk(id);
        if (!row) throw ApiError.NotFound("error-record-not-found");
        if (row.status !== "PENDING")
            throw ApiError.Conflict("error-profile-request-not-pending");
        const member = await this.memberModel.findByPk(row.memberId, {
            raw: true,
        });
        if (!member || !this.covers(scope.scopes, member.memberType))
            throw ApiError.Forbidden("error-profile-approver-forbidden");
        // Không tự duyệt thay đổi của chính mình
        if ("selfId" in scope && scope.selfId === member._id)
            throw ApiError.Forbidden("error-self-review");
        if (!approve && !reason?.trim())
            throw ApiError.BadRequest("error-profile-reject-reason");
        const delegation =
            "delegations" in scope && scope.delegations.length
                ? scope.delegations.find((item) =>
                      this.covers(new Set([item.scope]), member.memberType),
                  )
                : null;
        const onBehalfOf = delegation
            ? await this.userName(delegation.createdBy)
            : null;
        let effective: string | null = null;
        await this.sequelize.transaction(async (t) => {
            if (approve) {
                const update = Object.fromEntries(
                    row.changes.map((change) => [
                        change.field,
                        change.newValue,
                    ]),
                );
                if (update.nationalId) {
                    const other = await this.memberModel.findOne({
                        where: {
                            nationalId: update.nationalId,
                            _id: { [Op.ne]: member._id },
                        },
                        raw: true,
                        transaction: t,
                    });
                    if (other)
                        throw ApiError.Conflict("error-national-id-duplicate", {
                            code: other.memberCode,
                            name: other.fullName,
                        });
                }
                effective = await this.profile.applyOfficial(
                    member,
                    update,
                    user,
                    "APPROVED",
                    {
                        requestId: row._id,
                        t,
                    },
                );
            }
            await row.update(
                {
                    status: approve ? "APPROVED" : "REJECTED",
                    decidedBy: user._id,
                    decidedAt: this.timeService.now(),
                    reason: reason?.trim() || null,
                    onBehalfOf: onBehalfOf
                        ? `Admin toàn cục ${onBehalfOf}`
                        : null,
                    effectivePeriodCode: effective,
                },
                { transaction: t },
            );
        });
        const fields = row.changes
            .filter((change) => change.field !== "bankName")
            .map((change) => PROFILE_FIELD_NAME[change.field] ?? change.field)
            .join(", ");
        await this.activityLog.log(user, {
            module: "MEMBER",
            action: approve
                ? "PROFILE_CHANGE_APPROVE"
                : "PROFILE_CHANGE_REJECT",
            targetId: member._id,
            targetName: `${member.memberCode} - ${member.fullName}`,
            summary: `${approve ? "Duyệt" : "Từ chối"} thay đổi ${fields} của ${member.fullName}${effective ? ` (ngân hàng áp dụng từ kỳ PC-${effective})` : ""}${reason?.trim() ? `. Lý do: ${reason.trim()}` : ""}${onBehalfOf ? ` (duyệt thay cho Admin toàn cục ${onBehalfOf})` : ""}`,
            detail: {
                changes: row.changes.map((change) =>
                    ["bankAccount", "nationalId"].includes(change.field)
                        ? {
                              ...change,
                              oldValue: maskSensitive(change.oldValue),
                              newValue: maskSensitive(change.newValue),
                          }
                        : change,
                ),
            },
            onBehalfOf: delegation
                ? { memberId: delegation.createdBy, name: onBehalfOf ?? "" }
                : null,
        });
        return await this.requestModel.findByPk(id, { raw: true });
    }

    // ------------------------------------------------------------------
    // Ủy quyền duyệt (chỉ Admin toàn cục)
    // ------------------------------------------------------------------

    async listApprovers() {
        const rows = await this.approverModel.findAll({
            order: [["createdAt", "DESC"]],
            raw: true,
        });
        const members = new Map(
            (rows.length
                ? await this.memberModel.findAll({
                      where: { _id: rows.map((row) => row.memberId) },
                      raw: true,
                  })
                : []
            ).map((item) => [item._id, item]),
        );
        const today = vnDateKey(this.timeService.now());
        return rows.map((row) => ({
            ...row,
            member: members.get(row.memberId)
                ? {
                      _id: row.memberId,
                      memberCode: members.get(row.memberId).memberCode,
                      fullName: members.get(row.memberId).fullName,
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

    async addApprover(
        user: User,
        dto: {
            memberId: string;
            scope: string;
            startDate: string;
            endDate: string;
            note?: string;
        },
    ) {
        const member = await this.memberModel.findByPk(dto.memberId, {
            raw: true,
        });
        if (!member || !member.userId)
            throw ApiError.NotFound("error-record-not-found");
        if (
            !["ALL", "MENTEE", "MENTOR"].includes(dto.scope) ||
            dto.endDate < dto.startDate
        )
            throw ApiError.BadRequest("error-delegation-invalid");
        const row = await this.approverModel.create({
            memberId: dto.memberId,
            scope: dto.scope,
            startDate: dto.startDate,
            endDate: dto.endDate,
            note: dto.note?.trim() || null,
            createdBy: user._id,
        });
        const scopeLabel = {
            ALL: "mọi thành viên",
            MENTEE: "MTE",
            MENTOR: "MTO",
        }[dto.scope];
        await this.activityLog.log(user, {
            module: "DELEGATION",
            action: "PROFILE_APPROVER_ADD",
            targetId: row._id,
            targetName: member.fullName,
            summary: `Ủy quyền ${member.fullName} duyệt thay đổi hồ sơ nhạy cảm của ${scopeLabel} từ ${dto.startDate.split("-").reverse().join("/")} đến ${dto.endDate.split("-").reverse().join("/")}`,
        });
        return row.get({ plain: true });
    }

    async revokeApprover(user: User, id: string) {
        const row = await this.approverModel.findByPk(id);
        if (!row) throw ApiError.NotFound("error-record-not-found");
        if (!row.revokedAt) await row.update({ revokedAt: new Date() });
        const member = await this.memberModel.findByPk(row.memberId, {
            raw: true,
        });
        await this.activityLog.log(user, {
            module: "DELEGATION",
            action: "PROFILE_APPROVER_REVOKE",
            targetId: row._id,
            targetName: member?.fullName ?? null,
            summary: `Thu hồi quyền duyệt hồ sơ của ${member?.fullName ?? row.memberId}`,
        });
        return row.get({ plain: true });
    }
}
