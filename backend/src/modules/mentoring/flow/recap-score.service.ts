import { ApiError } from "@config/exception/api-error";
import { AttachmentFlowService } from "@module/attachment/attachment-flow.service";
import { AttachmentOwnerType } from "@module/attachment/common/constant";
import { RECAP_MODULE_CODE } from "@module/learning/common/constant";
import { LearningModuleModel } from "@module/learning/models/learning-module.model";
import { ModuleCriterionModel } from "@module/learning/models/module-criterion.model";
import { MemberModel } from "@module/member/models/member.model";
import { GroupAccessService } from "@module/organization/flow/group-access.service";
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
import { ScoreRecapDto } from "./dto/score-recap.dto";
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

    /** Toàn quyền chấm: Admin hoặc được giao quyền module RECAP */
    private async isGlobalReviewer(user: User, moduleId: string) {
        if (user.systemRole === SystemRole.ADMIN) return true;
        return Boolean(
            await this.permissionModel.findOne({
                where: {
                    userId: user._id,
                    scope: AdminScope.LEARNING_MODULE,
                    moduleId,
                },
                raw: true,
            }),
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
        const scope = await this.groupAccess.reviewerScope(user, {
            requireReview: true,
            groupId,
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
        const inScope = sessions.filter((session) => {
            const pair = pairs.get(session.pairId);
            return (
                pair &&
                (scope.all ||
                    scope.memberIds.has(pair.menteeId) ||
                    scope.memberIds.has(pair.mentorId))
            );
        });
        const recaps = inScope.length
            ? await this.recapModel.findAll({
                  where: { sessionId: inScope.map((item) => item._id) },
                  raw: true,
              })
            : [];
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
            (await this.groupAccess.groups(true)).map((group) => [
                group._id,
                group,
            ]),
        );
        const groupOf = (memberId: string) =>
            groups.get(
                memberships.find((row) => row.memberId === memberId)?.groupId,
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
                const mentor = recaps.find(
                    (item) =>
                        item.sessionId === session._id &&
                        item.role === MentoringRole.MENTOR,
                );
                const mentee = recaps.find(
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
                    groupName: groupOf(pair.menteeId) ?? groupOf(pair.mentorId),
                    canScore:
                        !conflict &&
                        recap.reviewStatus !== RecapReviewStatus.REJECTED,
                    conflict,
                };
            })
            .filter((row) => {
                if (query.filter === "SCORED") return row.score !== null;
                if (query.filter === "ALL") return true;
                return (
                    row.score === null &&
                    row.reviewStatus !== RecapReviewStatus.REJECTED
                );
            })
            .sort(
                (a, b) =>
                    new Date(a.session.scheduledStartAt).getTime() -
                        new Date(b.session.scheduledStartAt).getTime() ||
                    a.session.code.localeCompare(b.session.code),
            );
        return { rubric, rows };
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
        if (!(await this.isGlobalReviewer(user, rubric.module._id))) {
            const scope = await this.groupAccess.reviewerScope(user, {
                requireReview: true,
            });
            if (
                !scope.memberIds.has(pair.menteeId) &&
                !scope.memberIds.has(pair.mentorId)
            )
                throw ApiError.Forbidden("error-forbidden");
            if (
                scope.memberId === pair.menteeId ||
                scope.memberId === pair.mentorId
            )
                throw ApiError.Forbidden("error-recap-score-conflict");
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
        const updated = await this.recapModel.findByPk(recap._id, {
            raw: true,
        });
        return {
            ...updated,
            score: updated.score === null ? null : Number(updated.score),
        };
    }
}
