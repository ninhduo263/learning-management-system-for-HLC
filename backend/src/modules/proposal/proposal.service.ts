import { ApiError } from "@config/exception/api-error";
import { ActivityLogService } from "@module/activity-log/activity-log.service";
import { MemberModel } from "@module/member/models/member.model";
import { MentoringFlowService } from "@module/mentoring/flow/mentoring-flow.service";
import { MentoringSessionModel } from "@module/mentoring/models/mentoring-session.model";
import { RolePermission } from "@module/organization/common/constant";
import { GroupAccessService } from "@module/organization/flow/group-access.service";
import { PositionModel } from "@module/organization/models/position.model";
import { AdminScope } from "@module/permission/common/constant";
import { PointFlowService } from "@module/point/flow/point-flow.service";
import { PointTypeModel } from "@module/point/models/point-type.model";
import { SystemRole } from "@module/user/common/constant";
import { User } from "@module/user/entities/user.entity";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Op } from "sequelize";
import {
    PROPOSAL_RULES,
    ProposalDecider,
    ProposalStatus,
    ProposalType,
} from "./common/constant";
import { CreateProposalDto } from "./dto/create-proposal.dto";
import { ProposalModel } from "./models/proposal.model";

const PERIOD_CODE = /^\d{4}-(0[1-9]|1[0-2])$/;
const MENTOR_CODE = /^HLC-MTO-\d{5}$/i;
const MENTEE_CODE = /^HLC-MTE-\d{5}$/i;
const MENTORING_TARGETS = ["SESSION", "RECAP", "MEMBER_SCORE", "AWARD"];

/**
 * Đề xuất giữa các chức vụ: chức vụ không có quyền sửa gửi đề xuất kèm lý do cho chức vụ nắm quyền; người
 * nắm quyền duyệt hoặc từ chối. Duyệt thì hệ thống áp dụng luôn (đổi cặp, ghi dòng điều chỉnh điểm).
 * Mọi đề xuất giữ lại làm lịch sử (gồm người đề xuất, lý do, người duyệt, kết quả) và ghi nhật ký thao tác.
 */
@Injectable()
export class ProposalService {
    constructor(
        private readonly groupAccess: GroupAccessService,
        private readonly activityLog: ActivityLogService,
        private readonly mentoringFlow: MentoringFlowService,
        private readonly pointFlow: PointFlowService,
        @InjectModel(ProposalModel)
        private readonly proposalModel: typeof ProposalModel,
        @InjectModel(MemberModel)
        private readonly memberModel: typeof MemberModel,
        @InjectModel(MentoringSessionModel)
        private readonly sessionModel: typeof MentoringSessionModel,
        @InjectModel(PointTypeModel)
        private readonly pointTypeModel: typeof PointTypeModel,
        @InjectModel(PositionModel)
        private readonly positionModel: typeof PositionModel,
    ) {}

    // ------------------------------------------------------------------
    // Quyền
    // ------------------------------------------------------------------

    /** Loại đề xuất người này được gửi / được quyết định */
    async abilities(user: User) {
        const caps = await this.groupAccess.capabilities(user);
        const superAdmin = user.systemRole === SystemRole.ADMIN;
        const propose = Object.values(ProposalType).filter(
            (type) =>
                !superAdmin &&
                caps.scopes.has(PROPOSAL_RULES[type].proposerScope),
        );
        const canDecideMentoring =
            superAdmin || caps.scopes.has(AdminScope.MENTORING);
        const canDecideFund =
            superAdmin || caps.actions.has(RolePermission.EDIT_POINTS);
        const decide = Object.values(ProposalType).filter((type) =>
            PROPOSAL_RULES[type].decider === ProposalDecider.MENTORING
                ? canDecideMentoring
                : canDecideFund,
        );
        return { propose, decide, superAdmin };
    }

    private async proposerRole(user: User, type: ProposalType) {
        const member = await this.groupAccess.memberOfUser(user);
        if (member) {
            const holders = await this.groupAccess.activeHolders({
                memberId: member._id,
            });
            const wanted = PROPOSAL_RULES[type].proposerScope;
            const holder = holders.find(
                (row) => row.position.adminScope === wanted,
            );
            if (holder) return { member, role: holder.position.name };
        }
        return { member, role: PROPOSAL_RULES[type].proposerLabel };
    }

    // ------------------------------------------------------------------
    // Gửi đề xuất
    // ------------------------------------------------------------------

    private async validate(dto: CreateProposalDto) {
        const payload = dto.payload ?? {};
        const invalid = () => ApiError.BadRequest("error-proposal-invalid");
        switch (dto.type) {
            case ProposalType.PAIR_CHANGE: {
                const session = await this.sessionModel.findByPk(dto.targetId, {
                    raw: true,
                });
                if (!session) throw invalid();
                if (
                    !MENTOR_CODE.test(String(payload.mentorCode ?? "")) ||
                    !MENTEE_CODE.test(String(payload.menteeCode ?? ""))
                )
                    throw invalid();
                const [mentor, mentee] = await Promise.all([
                    this.memberModel.findOne({
                        where: {
                            memberCode: String(
                                payload.mentorCode,
                            ).toUpperCase(),
                        },
                        raw: true,
                    }),
                    this.memberModel.findOne({
                        where: {
                            memberCode: String(
                                payload.menteeCode,
                            ).toUpperCase(),
                        },
                        raw: true,
                    }),
                ]);
                if (!mentor || !mentee) throw invalid();
                return {
                    targetType: "SESSION",
                    payload: {
                        mentorCode: mentor.memberCode,
                        menteeCode: mentee.memberCode,
                    },
                    title: `Đổi cặp buổi ${session.code}: ${mentor.fullName} (${mentor.memberCode}) – ${mentee.fullName} (${mentee.memberCode})`,
                };
            }
            case ProposalType.POINT_ADJUST:
            case ProposalType.MENTORING_POINT: {
                const member = await this.memberModel.findByPk(dto.targetId, {
                    raw: true,
                });
                const points = Number(payload.points);
                if (
                    !member ||
                    !PERIOD_CODE.test(String(payload.periodCode ?? "")) ||
                    !Number.isFinite(points) ||
                    points === 0 ||
                    Math.abs(points) > 100
                )
                    throw invalid();
                let pointTypeCode: string | undefined;
                if (payload.pointTypeCode) {
                    const type = await this.pointTypeModel.findOne({
                        where: { code: String(payload.pointTypeCode) },
                        raw: true,
                    });
                    if (!type) throw invalid();
                    pointTypeCode = type.code;
                }
                // Điểm có gốc từ mentoring phải liên kết về dữ liệu mentoring gốc (không lặp dữ liệu)
                const source: Record<string, unknown> = {};
                if (dto.type === ProposalType.MENTORING_POINT) {
                    if (
                        !MENTORING_TARGETS.includes(
                            String(payload.sourceType),
                        ) ||
                        !payload.sourceId
                    )
                        throw invalid();
                    source.sourceType = String(payload.sourceType);
                    source.sourceId = String(payload.sourceId);
                }
                return {
                    targetType: "MEMBER",
                    payload: {
                        periodCode: String(payload.periodCode),
                        points,
                        ...(pointTypeCode && { pointTypeCode }),
                        ...source,
                    },
                    title: `${points > 0 ? "Cộng" : "Trừ"} ${Math.abs(points)} điểm cho ${member.fullName} (${member.memberCode}) kỳ ${payload.periodCode}`,
                };
            }
            case ProposalType.MENTORING_DATA: {
                const targetType = String(dto.targetType ?? "");
                if (!MENTORING_TARGETS.includes(targetType)) throw invalid();
                return {
                    targetType,
                    payload,
                    title: `Điều chỉnh dữ liệu mentoring (${targetType === "SESSION" ? "buổi" : targetType === "RECAP" ? "recap" : targetType === "AWARD" ? "giải cặp" : "điểm"})`,
                };
            }
            default:
                throw invalid();
        }
    }

    async create(user: User, dto: CreateProposalDto) {
        const { propose } = await this.abilities(user);
        if (!propose.includes(dto.type))
            throw ApiError.Forbidden("error-proposal-forbidden");
        if (!dto.reason?.trim())
            throw ApiError.BadRequest("error-proposal-reason-required");
        const checked = await this.validate(dto);
        const { member, role } = await this.proposerRole(user, dto.type);
        const row = await this.proposalModel.create({
            type: dto.type,
            status: ProposalStatus.PENDING,
            decider: PROPOSAL_RULES[dto.type].decider,
            title: checked.title,
            reason: dto.reason.trim(),
            targetType: checked.targetType,
            targetId: dto.targetId,
            payload: checked.payload,
            proposerUserId: user._id,
            proposerMemberId: member?._id ?? null,
            proposerName: user.fullname || user.username || user._id,
            proposerRole: role,
        });
        await this.activityLog.log(user, {
            module: "PROPOSAL",
            action: "PROPOSAL_CREATE",
            targetId: row._id,
            targetName: checked.title,
            summary: `${role} đề xuất gửi ${PROPOSAL_RULES[dto.type].deciderLabel}: ${checked.title}. Lý do: ${dto.reason.trim()}`,
            detail: { type: dto.type, payload: checked.payload },
        });
        return this.view(
            row.get({ plain: true }),
            { decide: [], superAdmin: false },
            user._id,
        );
    }

    // ------------------------------------------------------------------
    // Xem
    // ------------------------------------------------------------------

    private view(
        row: ProposalModel,
        abilities: { decide: ProposalType[]; superAdmin: boolean },
        userId?: string,
    ) {
        const rule = PROPOSAL_RULES[row.type as ProposalType];
        return {
            ...row,
            typeLabel: rule?.label ?? row.type,
            deciderLabel: rule?.deciderLabel ?? row.decider,
            canDecide:
                row.status === ProposalStatus.PENDING &&
                abilities.decide.includes(row.type as ProposalType),
            canCancel:
                row.status === ProposalStatus.PENDING &&
                Boolean(userId) &&
                row.proposerUserId === userId,
        };
    }

    /** box: mine (tôi đã gửi) | inbox (tôi được quyền duyệt) | all (Admin toàn cục) */
    async list(
        user: User,
        query: { box?: string; status?: string; type?: string },
    ) {
        const abilities = await this.abilities(user);
        const where: Record<string, unknown> = {};
        if (query.status) where.status = query.status;
        if (query.type) where.type = query.type;
        if (query.box === "inbox") {
            if (!abilities.decide.length) return [];
            where.type = query.type
                ? abilities.decide.filter((item) => item === query.type)
                : abilities.decide;
        } else if (query.box === "all" && abilities.superAdmin) {
            // toàn bộ
        } else {
            where.proposerUserId = user._id;
        }
        const rows = await this.proposalModel.findAll({
            where,
            order: [["createdAt", "DESC"]],
            limit: 300,
            raw: true,
        });
        return rows.map((row) =>
            this.view(row as ProposalModel, abilities, user._id),
        );
    }

    async get(user: User, id: string) {
        const abilities = await this.abilities(user);
        const row = await this.proposalModel.findByPk(id, { raw: true });
        if (!row) throw ApiError.NotFound("error-proposal-not-found");
        const mine = row.proposerUserId === user._id;
        const canDecide = abilities.decide.includes(row.type as ProposalType);
        if (!mine && !canDecide && !abilities.superAdmin)
            throw ApiError.Forbidden("error-proposal-forbidden");
        return this.view(row as ProposalModel, abilities, user._id);
    }

    /** Số đề xuất đang chờ tôi duyệt (huy hiệu trên menu) và quyền gửi / duyệt của tôi */
    async summary(user: User) {
        const abilities = await this.abilities(user);
        const pendingInbox = abilities.decide.length
            ? await this.proposalModel.count({
                  where: {
                      status: ProposalStatus.PENDING,
                      type: { [Op.in]: abilities.decide },
                  },
              })
            : 0;
        return {
            canPropose: abilities.propose,
            canDecide: abilities.decide,
            pendingInbox,
        };
    }

    // ------------------------------------------------------------------
    // Duyệt / rút
    // ------------------------------------------------------------------

    /** Áp dụng đề xuất đã duyệt; trả id bản ghi sinh ra (nếu có) */
    private async apply(
        row: ProposalModel,
        decider: User,
    ): Promise<string | null> {
        const payload = row.payload as Record<string, unknown>;
        switch (row.type as ProposalType) {
            case ProposalType.PAIR_CHANGE:
                await this.mentoringFlow.updateSessionPair(
                    row.targetId,
                    {
                        mentorCode: String(payload.mentorCode),
                        menteeCode: String(payload.menteeCode),
                    },
                    decider,
                );
                return row.targetId;
            case ProposalType.POINT_ADJUST:
            case ProposalType.MENTORING_POINT: {
                const type = payload.pointTypeCode
                    ? await this.pointTypeModel.findOne({
                          where: { code: String(payload.pointTypeCode) },
                          raw: true,
                      })
                    : null;
                const adjustment = await this.pointFlow.createAdjustment(
                    String(payload.periodCode),
                    {
                        memberId: row.targetId,
                        points: Number(payload.points),
                        pointTypeId: type?._id,
                        reason: `[Đề xuất của ${row.proposerRole} ${row.proposerName}] ${row.reason}`,
                    },
                    decider,
                );
                return (adjustment as { _id?: string })._id ?? null;
            }
            default:
                // MENTORING_DATA: ghi nhận đề xuất (Trưởng ban Mentoring tự điều chỉnh dữ liệu theo quyền của mình)
                return null;
        }
    }

    async decide(
        user: User,
        id: string,
        dto: { status: "APPROVED" | "REJECTED"; note?: string },
    ) {
        const abilities = await this.abilities(user);
        const found = await this.proposalModel.findByPk(id);
        if (!found) throw ApiError.NotFound("error-proposal-not-found");
        if (!abilities.decide.includes(found.type as ProposalType))
            throw ApiError.Forbidden("error-proposal-forbidden");
        if (dto.status === "REJECTED" && !dto.note?.trim())
            throw ApiError.BadRequest("error-proposal-reason-required");
        // Chuyển sang PROCESSING trước để hai người bấm cùng lúc không áp dụng hai lần
        const [claimed] = await this.proposalModel.update(
            { status: ProposalStatus.PROCESSING },
            { where: { _id: id, status: ProposalStatus.PENDING } },
        );
        if (!claimed) throw ApiError.Conflict("error-proposal-decided");
        let resultRef: string | null = null;
        try {
            if (dto.status === "APPROVED")
                resultRef = await this.apply(found, user);
        } catch (error) {
            await this.proposalModel.update(
                { status: ProposalStatus.PENDING },
                { where: { _id: id } },
            );
            throw error;
        }
        await this.proposalModel.update(
            {
                status: dto.status,
                deciderUserId: user._id,
                deciderName: user.fullname || user.username || user._id,
                decisionNote: dto.note?.trim() || null,
                decidedAt: new Date(),
                resultRef,
            },
            { where: { _id: id } },
        );
        await this.activityLog.log(user, {
            module: "PROPOSAL",
            action:
                dto.status === "APPROVED"
                    ? "PROPOSAL_APPROVE"
                    : "PROPOSAL_REJECT",
            targetId: id,
            targetName: found.title,
            summary: `${dto.status === "APPROVED" ? "Duyệt" : "Từ chối"} đề xuất của ${found.proposerRole} ${found.proposerName}: ${found.title}${dto.note?.trim() ? `. Ghi chú: ${dto.note.trim()}` : ""}`,
            detail: { type: found.type, resultRef },
        });
        return this.get(user, id);
    }

    async cancel(user: User, id: string) {
        const row = await this.proposalModel.findByPk(id);
        if (!row) throw ApiError.NotFound("error-proposal-not-found");
        if (row.proposerUserId !== user._id)
            throw ApiError.Forbidden("error-proposal-forbidden");
        const [changed] = await this.proposalModel.update(
            { status: ProposalStatus.CANCELLED, decidedAt: new Date() },
            { where: { _id: id, status: ProposalStatus.PENDING } },
        );
        if (!changed) throw ApiError.Conflict("error-proposal-decided");
        await this.activityLog.log(user, {
            module: "PROPOSAL",
            action: "PROPOSAL_CANCEL",
            targetId: id,
            targetName: row.title,
            summary: `Rút đề xuất: ${row.title}`,
        });
        return this.get(user, id);
    }
}
