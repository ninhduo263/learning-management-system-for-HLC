import { ActivityLogService } from "@module/activity-log/activity-log.service";
import { ApiError } from "@config/exception/api-error";
import { AttachmentFlowService } from "@module/attachment/attachment-flow.service";
import { AttachmentOwnerType } from "@module/attachment/common/constant";
import { RECAP_MODULE_CODE } from "@module/learning/common/constant";
import { LearningModuleModel } from "@module/learning/models/learning-module.model";
import { ModuleCriterionModel } from "@module/learning/models/module-criterion.model";
import { MemberModel } from "@module/member/models/member.model";
import {
    onBehalfOf,
    GroupAccessService,
} from "@module/organization/flow/group-access.service";
import {
    GroupKind,
    RolePermission,
} from "@module/organization/common/constant";
import { PeriodFlowService } from "@module/period/flow/period-flow.service";
import { AdminScope } from "@module/permission/common/constant";
import { AdminPermissionModel } from "@module/permission/models/admin-permission.model";
import { TimeService } from "@module/time/time.service";
import { SystemRole } from "@module/user/common/constant";
import { User } from "@module/user/entities/user.entity";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Op } from "sequelize";
import {
    MentoringPairStatus,
    MentoringRole,
    MentoringSessionStatus,
    RecapReviewStatus,
} from "../common/constant";
import { MentoringPairModel } from "../models/mentoring-pair.model";
import { MentoringRecapModel } from "../models/mentoring-recap.model";
import { MentoringSessionModel } from "../models/mentoring-session.model";
import { MentoringQuarterModel } from "../models/mentoring-quarter.model";
import { MentoringRecapLogModel } from "../models/mentoring-recap-log.model";
import {
    PointEntryStatus,
    PointSourceType,
} from "@module/point/common/constant";
import { PointEntryModel } from "@module/point/models/point-entry.model";
import { PointTypeModel } from "@module/point/models/point-type.model";
import { UserModel } from "@module/repository/sequelize/model/user.model";
import { ScoreRecapDto } from "./dto/score-recap.dto";
import { RecapAccessService } from "./recap-access.service";
import { pairRecapStatus, roleRecapStatus } from "./mentoring-rules";

export interface RecapReviewQuery {
    period?: string;
    groupId?: string;
    /** UNSCORED (mặc định) | SCORED | ALL */
    filter?: string;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Chấm recap 1on1 thang 100 theo tiêu chí của module học tập "Recap mentoring".
 * Điểm lưu ngay trên bài recap gốc (MentoringRecap), không sao chép sang bài nộp học tập.
 * Người chấm: Admin, người có quyền module RECAP, hoặc Leader/Phó nhóm (không chấm cặp mình tham gia).
 */
@Injectable()
export class RecapScoreService {
    constructor(
        private readonly timeService: TimeService,
        private readonly periodFlow: PeriodFlowService,
        private readonly groupAccess: GroupAccessService,
        private readonly activityLog: ActivityLogService,
        private readonly recapAccess: RecapAccessService,
        private readonly attachments: AttachmentFlowService,
        @InjectModel(LearningModuleModel)
        private readonly moduleModel: typeof LearningModuleModel,
        @InjectModel(ModuleCriterionModel)
        private readonly criterionModel: typeof ModuleCriterionModel,
        @InjectModel(AdminPermissionModel)
        private readonly permissionModel: typeof AdminPermissionModel,
        @InjectModel(MentoringRecapModel)
        private readonly recapModel: typeof MentoringRecapModel,
        @InjectModel(MentoringSessionModel)
        private readonly sessionModel: typeof MentoringSessionModel,
        @InjectModel(MentoringPairModel)
        private readonly pairModel: typeof MentoringPairModel,
        @InjectModel(MentoringQuarterModel)
        private readonly quarterModel: typeof MentoringQuarterModel,
        @InjectModel(MemberModel)
        private readonly memberModel: typeof MemberModel,
        @InjectModel(MentoringRecapLogModel)
        private readonly recapLogModel: typeof MentoringRecapLogModel,
        @InjectModel(PointEntryModel)
        private readonly pointEntryModel: typeof PointEntryModel,
        @InjectModel(PointTypeModel)
        private readonly pointTypeModel: typeof PointTypeModel,
    ) {}

    /** Module RECAP + tiêu chí chấm */
    async rubric() {
        const module = await this.moduleModel.findOne({
            where: { code: RECAP_MODULE_CODE },
            raw: true,
        });
        if (!module) throw ApiError.NotFound("error-learning-module-not-found");
        const criteria = await this.criterionModel.findAll({
            where: { moduleId: module._id },
            order: [["sortOrder", "ASC"]],
            raw: true,
        });
        return {
            module: {
                _id: module._id,
                code: module.code,
                name: module.name,
                maxScore: Number(module.maxScore ?? 100),
            },
            criteria: criteria.map((item) => ({
                _id: item._id,
                name: item.name,
                description: item.description ?? null,
                maxScore: Number(item.maxScore),
            })),
        };
    }

    /**
     * Toàn quyền chấm: Admin toàn cục, Trưởng ban Mentoring, Trưởng ban MTE (nhóm MTE), hoặc Admin module RECAP.
     * Trưởng ban Học tập chỉ XEM mentoring (điểm recap góp vào điểm học tập trung bình), không chấm, không duyệt.
     */
    private async isGlobalReviewer(user: User, moduleId: string) {
        if (user.systemRole === SystemRole.ADMIN) return true;
        const { scopes, moduleIds } = await this.groupAccess.capabilities(user);
        if (scopes.has(AdminScope.MENTORING) || scopes.has(AdminScope.MENTEE))
            return true;
        return Boolean(moduleIds?.includes(moduleId));
    }

    /** Duyệt recap MTO: chỉ Admin toàn cục / Admin Mentoring */
    private async isMentoringAdmin(user: User) {
        if (user.systemRole === SystemRole.ADMIN) return true;
        return (await this.groupAccess.capabilities(user)).scopes.has(
            AdminScope.MENTORING,
        );
    }

    private async scope(user: User, moduleId: string, groupId?: string) {
        if (await this.isGlobalReviewer(user, moduleId)) {
            if (!groupId)
                return {
                    all: true,
                    memberIds: new Set<string>(),
                    selfId: null as string | null,
                };
            const memberIds = new Set(
                (await this.groupAccess.currentMemberships([groupId])).map(
                    (row) => row.memberId,
                ),
            );
            return { all: false, memberIds, selfId: null as string | null };
        }
        // Leader/Phó: chỉ nhóm MTE của mình
        const scope = await this.groupAccess.reviewerScope(user, {
            permission: RolePermission.SCORE_RECAP,
            groupId,
            kind: GroupKind.MENTEE,
        });
        if (!scope.groupIds.length) throw ApiError.Forbidden("error-forbidden");
        return {
            all: false,
            memberIds: scope.memberIds,
            selfId: scope.memberId,
        };
    }

    async list(user: User, query: RecapReviewQuery) {
        const rubric = await this.rubric();
        const scope = await this.scope(user, rubric.module._id, query.groupId);
        const now = this.timeService.now();
        const period = query.period
            ? await this.periodFlow.getByCode(query.period)
            : null;
        const sessions = await this.sessionModel.findAll({
            where: {
                status: MentoringSessionStatus.ACTIVE,
                scheduledStartAt: { [Op.ne]: null },
                ...(period && { periodId: period._id }),
            },
            raw: true,
        });
        const pairs = new Map(
            (sessions.length
                ? await this.pairModel.findAll({
                      where: {
                          _id: sessions.map((item) => item.pairId),
                          status: { [Op.ne]: MentoringPairStatus.CANCELLED },
                      },
                      raw: true,
                  })
                : []
            ).map((pair) => [pair._id, pair]),
        );
        // Cặp thuộc nhóm MTE của mentee
        const inScope = sessions.filter((session) => {
            const pair = pairs.get(session.pairId);
            return pair && (scope.all || scope.memberIds.has(pair.menteeId));
        });
        const allRecaps = inScope.length
            ? await this.recapModel.findAll({
                  where: { sessionId: inScope.map((item) => item._id) },
                  raw: true,
              })
            : [];
        // Recap MTO: MTE trong cặp và Leader nhóm XEM mặc định; duyệt / không duyệt chỉ khi là Trưởng ban Mentoring
        // hoặc được ủy quyền (canScore bên dưới)
        const recaps = allRecaps;
        const canReviewPair = new Map<string, boolean>();
        for (const pair of pairs.values())
            canReviewPair.set(
                pair._id,
                await this.recapAccess.canReview(user, pair),
            );
        const memberIds = [
            ...new Set(
                [...pairs.values()].flatMap((pair) => [
                    pair.mentorId,
                    pair.menteeId,
                ]),
            ),
        ];
        const members = new Map(
            (
                await this.memberModel.findAll({
                    where: { _id: memberIds },
                    raw: true,
                })
            ).map((member) => [member._id, member]),
        );
        const memberships = await this.groupAccess.currentMemberships();
        const groups = new Map(
            (await this.groupAccess.groups(true, GroupKind.MENTEE)).map(
                (group) => [group._id, group],
            ),
        );
        const groupOf = (memberId: string) =>
            groups.get(
                memberships.find(
                    (row) =>
                        row.memberId === memberId && groups.has(row.groupId),
                )?.groupId,
            )?.name ?? null;
        const files = await this.attachments.listFor(
            AttachmentOwnerType.MENTORING_RECAP,
            recaps.map((recap) => recap._id),
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
        const rows = recaps
            .map((recap) => {
                const session = inScope.find(
                    (item) => item._id === recap.sessionId,
                );
                const pair = pairs.get(session.pairId);
                const mentor = allRecaps.find(
                    (item) =>
                        item.sessionId === session._id &&
                        item.role === MentoringRole.MENTOR,
                );
                const mentee = allRecaps.find(
                    (item) =>
                        item.sessionId === session._id &&
                        item.role === MentoringRole.MENTEE,
                );
                const conflict =
                    Boolean(scope.selfId) &&
                    (pair.mentorId === scope.selfId ||
                        pair.menteeId === scope.selfId);
                return {
                    _id: recap._id,
                    role: recap.role,
                    content: recap.content,
                    firstSubmittedAt: recap.firstSubmittedAt,
                    isLate: recap.isLate,
                    reviewStatus: recap.reviewStatus,
                    reviewNote: recap.reviewNote ?? null,
                    score:
                        recap.score === null || recap.score === undefined
                            ? null
                            : Number(recap.score),
                    scoreDetails: recap.scoreDetails ?? [],
                    scoreFeedback: recap.scoreFeedback ?? null,
                    scoredAt: recap.scoredAt ?? null,
                    files: files.get(recap._id) ?? [],
                    author: brief(recap.memberId),
                    session: {
                        _id: session._id,
                        code: session.code,
                        scheduledStartAt: session.scheduledStartAt,
                        recapDeadlineAt: session.recapDeadlineAt,
                        pairStatus: pairRecapStatus(
                            session,
                            roleRecapStatus(session, mentor, now),
                            roleRecapStatus(session, mentee, now),
                        ),
                    },
                    mentor: brief(pair.mentorId),
                    mentee: brief(pair.menteeId),
                    groupName: groupOf(pair.menteeId),
                    /** SCORE: recap MTE chấm thang 100; APPROVE: recap MTO chỉ Duyệt / Không duyệt */
                    mode:
                        recap.role === MentoringRole.MENTOR
                            ? ("APPROVE" as const)
                            : ("SCORE" as const),
                    canScore:
                        recap.role === MentoringRole.MENTOR
                            ? Boolean(canReviewPair.get(pair._id))
                            : !conflict &&
                              recap.reviewStatus !== RecapReviewStatus.REJECTED,
                    conflict,
                };
            })
            .filter((row) => {
                const done =
                    row.mode === "APPROVE"
                        ? row.reviewStatus !== RecapReviewStatus.PENDING
                        : row.score !== null;
                if (query.filter === "SCORED") return done;
                if (query.filter === "ALL") return true;
                return !done && row.reviewStatus !== RecapReviewStatus.REJECTED;
            })
            .sort(
                (a, b) =>
                    new Date(a.session.scheduledStartAt).getTime() -
                        new Date(b.session.scheduledStartAt).getTime() ||
                    a.session.code.localeCompare(b.session.code),
            );
        // Buổi đã có lịch nhưng chưa có recap MTO mà người này được ủy quyền nộp hộ (Admin / Trưởng ban Mentoring: mọi buổi)
        const missing: {
            session: {
                _id: string;
                code: string;
                scheduledStartAt: Date;
                recapDeadlineAt: Date;
            };
            mentor: ReturnType<typeof brief>;
            mentee: ReturnType<typeof brief>;
            groupName: string | null;
        }[] = [];
        for (const session of inScope) {
            if (
                allRecaps.some(
                    (item) =>
                        item.sessionId === session._id &&
                        item.role === MentoringRole.MENTOR,
                )
            )
                continue;
            const pair = pairs.get(session.pairId);
            if (!(await this.recapAccess.can(user, pair, "PROXY"))) continue;
            missing.push({
                session: {
                    _id: session._id,
                    code: session.code,
                    scheduledStartAt: session.scheduledStartAt,
                    recapDeadlineAt: session.recapDeadlineAt,
                },
                mentor: brief(pair.mentorId),
                mentee: brief(pair.menteeId),
                groupName: groupOf(pair.menteeId),
            });
        }
        return { rubric, rows, missing };
    }

    async score(user: User, recapId: string, dto: ScoreRecapDto) {
        const rubric = await this.rubric();
        const recap = await this.recapModel.findByPk(recapId, { raw: true });
        if (!recap) throw ApiError.NotFound("error-record-not-found");
        const session = await this.sessionModel.findByPk(recap.sessionId, {
            raw: true,
        });
        const pair = await this.pairModel.findByPk(session.pairId, {
            raw: true,
        });
        const quarter = await this.quarterModel.findByPk(pair.quarterId, {
            raw: true,
        });
        if (quarter?.isLocked)
            throw ApiError.Conflict("error-mentoring-quarter-locked", {
                code: quarter.code,
            });
        this.periodFlow.assertWritable(
            await this.periodFlow.getById(session.periodId),
        );
        const isMentorRecap = recap.role === MentoringRole.MENTOR;
        // Recap MTO: Admin toàn cục, Trưởng ban Mentoring hoặc người được Trưởng ban Mentoring ủy quyền
        const mentorAuth = isMentorRecap
            ? await this.recapAccess.authorize(user, pair, "REVIEW")
            : null;
        // Không chấm / duyệt recap của cặp mình tham gia, trừ khi được ủy quyền đúng cặp đó (MTE trong cặp)
        const self = await this.groupAccess.memberOfUser(user);
        if (
            self &&
            (self._id === pair.menteeId || self._id === pair.mentorId) &&
            mentorAuth?.scopeType !== "PAIR"
        )
            throw ApiError.Forbidden("error-recap-score-conflict");
        let behalf: { memberId: string; name: string } | null = null;
        if (
            !isMentorRecap &&
            !(await this.isGlobalReviewer(user, rubric.module._id))
        ) {
            const scope = await this.groupAccess.reviewerScope(user, {
                permission: RolePermission.SCORE_RECAP,
                kind: GroupKind.MENTEE,
            });
            if (!scope.memberIds.has(pair.menteeId))
                throw ApiError.Forbidden("error-forbidden");
            behalf = onBehalfOf(
                scope,
                await this.groupAccess.groupOfMember(
                    pair.menteeId,
                    GroupKind.MENTEE,
                ),
                RolePermission.SCORE_RECAP,
            );
        }
        const now = this.timeService.now();
        if (dto.status === "REJECTED") {
            if (!dto.feedback?.trim())
                throw ApiError.BadRequest(
                    "error-mentoring-review-note-required",
                );
            await this.recapModel.update(
                {
                    reviewStatus: RecapReviewStatus.REJECTED,
                    reviewNote: dto.feedback.trim(),
                    reviewedBy: user._id,
                    reviewedAt: now,
                    score: null,
                    scoreDetails: null,
                    scoreFeedback: dto.feedback.trim(),
                    scoredBy: user._id,
                    scoredAt: now,
                },
                { where: { _id: recap._id } },
            );
        } else if (isMentorRecap) {
            // Recap MTO: chỉ duyệt, không chấm điểm, không tính vào điểm của MTO
            await this.recapModel.update(
                {
                    reviewStatus: RecapReviewStatus.APPROVED,
                    reviewNote: null,
                    reviewedBy: user._id,
                    reviewedAt: now,
                    score: null,
                    scoreDetails: null,
                    scoreFeedback: dto.feedback?.trim() || null,
                    scoredBy: null,
                    scoredAt: null,
                },
                { where: { _id: recap._id } },
            );
        } else {
            const scores = dto.scores ?? [];
            const details = rubric.criteria.map((criterion) => {
                const item = scores.find(
                    (score) => score.criterionId === criterion._id,
                );
                if (
                    !item ||
                    item.score < 0 ||
                    item.score > criterion.maxScore
                ) {
                    throw ApiError.BadRequest(
                        "error-submission-score-invalid",
                        { name: criterion.name, max: criterion.maxScore },
                    );
                }
                return {
                    criterionId: criterion._id,
                    name: criterion.name,
                    maxScore: criterion.maxScore,
                    score: item.score,
                };
            });
            const max = details.reduce((sum, item) => sum + item.maxScore, 0);
            const total = max
                ? round2(
                      (details.reduce((sum, item) => sum + item.score, 0) /
                          max) *
                          rubric.module.maxScore,
                  )
                : 0;
            await this.recapModel.update(
                {
                    reviewStatus: RecapReviewStatus.APPROVED,
                    reviewNote: null,
                    reviewedBy: user._id,
                    reviewedAt: now,
                    score: total,
                    scoreDetails: details,
                    scoreFeedback: dto.feedback?.trim() || null,
                    scoredBy: user._id,
                    scoredAt: now,
                },
                { where: { _id: recap._id } },
            );
        }
        if (mentorAuth)
            await this.recapAccess.log(
                user,
                "RECAP_REVIEW",
                `${dto.status === "REJECTED" ? "Không duyệt" : "Duyệt"} recap MTO buổi ${session.code}`,
                { id: recap._id, name: session.code },
                mentorAuth,
            );
        if (behalf)
            await this.activityLog.log(user, {
                module: "MENTORING",
                action: "RECAP_SCORE_DELEGATED",
                targetId: recap._id,
                targetName: session.code,
                summary: `${dto.status === "REJECTED" ? "Trả lại" : "Chấm / duyệt"} recap ${session.code} (làm thay cho ${behalf.name})`,
                onBehalfOf: behalf,
            });
        const updated = await this.recapModel.findByPk(recap._id, {
            raw: true,
        });
        return {
            ...updated,
            score: updated.score === null ? null : Number(updated.score),
        };
    }

    /**
     * Nhật ký nộp / sửa recap (vòng 10) cho người duyệt: mọi lần nộp, sửa, nộp lại kèm nội dung trước / sau, mốc nộp lần
     * đầu (mốc so với hạn thưởng sớm) và điểm thưởng sớm đang được tính từ recap này. Người duyệt dùng để phát hiện nộp
     * sơ sài giữ mốc rồi sửa lại, và đề xuất Trưởng ban HLC Fund trừ thủ công nếu cần.
     */
    async history(user: User, recapId: string) {
        const recap = await this.recapModel.findByPk(recapId, { raw: true });
        if (!recap) throw ApiError.NotFound("error-record-not-found");
        const session = await this.sessionModel.findByPk(recap.sessionId, {
            raw: true,
        });
        const pair = await this.pairModel.findByPk(session.pairId, {
            raw: true,
        });
        // Trưởng ban HLC Fund (quyền sửa điểm) xem để quyết định đề xuất trừ điểm thưởng sớm
        const caps = await this.groupAccess.capabilities(user);
        if (
            user.systemRole === SystemRole.ADMIN ||
            caps.actions.has(RolePermission.EDIT_POINTS)
        ) {
            // được xem
        } else if (recap.role === MentoringRole.MENTOR) {
            await this.recapAccess.authorize(user, pair, "REVIEW");
        } else if (
            !(await this.isGlobalReviewer(
                user,
                (await this.rubric()).module._id,
            ))
        ) {
            const scope = await this.groupAccess.reviewerScope(user, {
                permission: RolePermission.SCORE_RECAP,
                kind: GroupKind.MENTEE,
            });
            if (!scope.memberIds.has(pair.menteeId))
                throw ApiError.Forbidden("error-forbidden");
        }
        const logs = await this.recapLogModel.findAll({
            where: { recapId },
            order: [["at", "ASC"]],
            raw: true,
        });
        const actorIds = [
            ...new Set(logs.map((row) => row.actorUserId).filter(Boolean)),
        ];
        const actors = new Map(
            (actorIds.length
                ? await UserModel.findAll({
                      where: { _id: actorIds },
                      attributes: ["_id", "username", "fullname"],
                      raw: true,
                  })
                : []
            ).map((row) => [row._id, row.fullname || row.username]),
        );
        const period = await this.periodFlow.getById(session.periodId);
        const entries = await this.pointEntryModel.findAll({
            where: {
                sourceType: PointSourceType.MENTORING_RECAP,
                sourceId: recapId,
                status: PointEntryStatus.ACTIVE,
            },
            raw: true,
        });
        const earlyType = await this.pointTypeModel.findOne({
            where: { code: "MENTORING_EARLY" },
            raw: true,
        });
        const member = await this.memberModel.findByPk(recap.memberId, {
            raw: true,
        });
        return {
            recapId,
            role: recap.role,
            sessionCode: session.code,
            periodCode: period?.code ?? null,
            member: member && {
                _id: member._id,
                memberCode: member.memberCode,
                fullName: member.fullName,
            },
            /** Mốc so với hạn thưởng sớm: lần nộp đầu tiên, không đổi khi sửa */
            initialSubmittedAt:
                recap.initialSubmittedAt ?? recap.firstSubmittedAt,
            lastSubmittedAt: recap.lastSubmittedAt,
            recapDeadlineAt: session.recapDeadlineAt ?? null,
            isLate: recap.isLate,
            reviewStatus: recap.reviewStatus,
            /** Điểm thưởng mentoring sớm đang được tính từ recap này */
            earlyBonus: entries
                .filter((row) => row.pointTypeId === earlyType?._id)
                .reduce((total, row) => total + Number(row.points), 0),
            earlyBonusPointTypeCode: earlyType?.code ?? null,
            /** Số lần sửa / nộp lại sau lần nộp đầu (gợi ý cho người duyệt) */
            editCount: logs.filter(
                (row) => row.action !== "SUBMIT" && row.action !== "PROXY",
            ).length,
            logs: logs.map((row) => ({
                _id: row._id,
                action: row.action,
                at: row.at,
                actorName: actors.get(row.actorUserId) ?? null,
                contentBefore: row.contentBefore ?? null,
                contentAfter: row.contentAfter,
                filesBefore: row.filesBefore ?? null,
                filesAfter: row.filesAfter ?? null,
            })),
        };
    }
}
