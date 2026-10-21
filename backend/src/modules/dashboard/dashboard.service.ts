import { vnParts } from "@common/utils/vn-date.util";
import { ApiError } from "@config/exception/api-error";
import { FundContributionStatus } from "@module/fund/common/constant";
import { FundFlowService } from "@module/fund/flow/fund-flow.service";
import { FundContributionModel } from "@module/fund/models/fund-contribution.model";
import {
    SubmissionReviewStatus,
    SubmissionStatus,
} from "@module/learning/common/constant";
import { LearningFlowService } from "@module/learning/flow/learning-flow.service";
import { LearningModuleModel } from "@module/learning/models/learning-module.model";
import { SubmissionModel } from "@module/learning/models/submission.model";
import { MemberStatus, MemberType } from "@module/member/common/constant";
import { MemberModel } from "@module/member/models/member.model";
import {
    MentoringPairStatus,
    MentoringRole,
    MentoringSessionStatus,
} from "@module/mentoring/common/constant";
import {
    pairRecapStatus,
    roleRecapStatus,
} from "@module/mentoring/flow/mentoring-rules";
import { MentoringAwardModel } from "@module/mentoring/models/mentoring-award.model";
import { MentoringPairModel } from "@module/mentoring/models/mentoring-pair.model";
import { MentoringRecapModel } from "@module/mentoring/models/mentoring-recap.model";
import { MentoringSessionModel } from "@module/mentoring/models/mentoring-session.model";
import { Period } from "@module/period/entities/period.entity";
import { PeriodFlowService } from "@module/period/flow/period-flow.service";
import { PeriodModel } from "@module/period/models/period.model";
import { PointFlowService } from "@module/point/flow/point-flow.service";
import { AllowanceSummaryModel } from "@module/point/models/allowance-summary.model";
import { TimeService } from "@module/time/time.service";
import { User } from "@module/user/entities/user.entity";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Op } from "sequelize";

type PairStatus = ReturnType<typeof pairRecapStatus>;

const round2 = (value: number) => Math.round(value * 100) / 100;

@Injectable()
export class DashboardService {
    constructor(
        private readonly timeService: TimeService,
        private readonly periodFlow: PeriodFlowService,
        private readonly pointFlow: PointFlowService,
        private readonly fundFlow: FundFlowService,
        private readonly learningFlow: LearningFlowService,
        @InjectModel(PeriodModel)
        private readonly periodModel: typeof PeriodModel,
        @InjectModel(MemberModel)
        private readonly memberModel: typeof MemberModel,
        @InjectModel(MentoringSessionModel)
        private readonly sessionModel: typeof MentoringSessionModel,
        @InjectModel(MentoringPairModel)
        private readonly pairModel: typeof MentoringPairModel,
        @InjectModel(MentoringRecapModel)
        private readonly recapModel: typeof MentoringRecapModel,
        @InjectModel(MentoringAwardModel)
        private readonly awardModel: typeof MentoringAwardModel,
        @InjectModel(SubmissionModel)
        private readonly submissionModel: typeof SubmissionModel,
        @InjectModel(LearningModuleModel)
        private readonly moduleModel: typeof LearningModuleModel,
        @InjectModel(FundContributionModel)
        private readonly fundModel: typeof FundContributionModel,
        @InjectModel(AllowanceSummaryModel)
        private readonly summaryModel: typeof AllowanceSummaryModel,
    ) {}

    private async periodOf(code?: string) {
        if (code) return this.periodFlow.getByCode(code);
        const now = vnParts(this.timeService.now());
        return this.periodFlow.ensurePeriod(now.year, now.month);
    }

    /** Trạng thái recap từng buổi của kỳ */
    private async mentoringOf(period: Period, memberId?: string) {
        const now = this.timeService.now();
        const pairWhere = {
            status: { [Op.ne]: MentoringPairStatus.CANCELLED },
            ...(memberId && {
                [Op.or]: [{ mentorId: memberId }, { menteeId: memberId }],
            }),
        };
        const sessions = await this.sessionModel.findAll({
            where: {
                periodId: period._id,
                status: MentoringSessionStatus.ACTIVE,
            },
            raw: true,
        });
        const pairs = new Map(
            (sessions.length
                ? await this.pairModel.findAll({
                      where: {
                          _id: sessions.map((item) => item.pairId),
                          ...pairWhere,
                      },
                      raw: true,
                  })
                : []
            ).map((pair) => [pair._id, pair]),
        );
        const active = sessions.filter((session) => pairs.has(session.pairId));
        const recaps = active.length
            ? await this.recapModel.findAll({
                  where: { sessionId: active.map((item) => item._id) },
                  raw: true,
              })
            : [];
        return active.map((session) => {
            const mentor = recaps.find(
                (recap) =>
                    recap.sessionId === session._id &&
                    recap.role === MentoringRole.MENTOR,
            );
            const mentee = recaps.find(
                (recap) =>
                    recap.sessionId === session._id &&
                    recap.role === MentoringRole.MENTEE,
            );
            const mentorStatus = roleRecapStatus(session, mentor, now);
            const menteeStatus = roleRecapStatus(session, mentee, now);
            return {
                session,
                pair: pairs.get(session.pairId),
                mentorStatus,
                menteeStatus,
                status: pairRecapStatus(
                    session,
                    mentorStatus,
                    menteeStatus,
                ) as PairStatus,
            };
        });
    }

    private async memberMap(ids: string[]) {
        const unique = [...new Set(ids.filter(Boolean))];
        return new Map(
            (unique.length
                ? await this.memberModel.findAll({
                      where: { _id: unique },
                      raw: true,
                  })
                : []
            ).map((member) => [
                member._id,
                {
                    _id: member._id,
                    memberCode: member.memberCode,
                    fullName: member.fullName,
                    memberType: member.memberType,
                },
            ]),
        );
    }

    async admin(code?: string) {
        const period = await this.periodOf(code);
        const members = await this.memberModel.findAll({
            where: { status: { [Op.ne]: MemberStatus.INACTIVE } },
            raw: true,
        });
        const mentees = members.filter(
            (member) => member.memberType === MemberType.MENTEE,
        );

        // Mentoring
        const sessions = await this.mentoringOf(period);
        const statusCount: Record<string, number> = {};
        sessions.forEach(
            (item) =>
                (statusCount[item.status] =
                    (statusCount[item.status] ?? 0) + 1),
        );
        const awards = await this.awardModel.findAll({
            where: { periodId: period._id },
            order: [["rank", "ASC"]],
            raw: true,
        });
        const people = await this.memberMap(
            sessions.flatMap((item) => [
                item.pair.mentorId,
                item.pair.menteeId,
            ]),
        );
        const pairView = (item: (typeof sessions)[number]) => ({
            sessionId: item.session._id,
            code: item.session.code,
            status: item.status,
            scheduledStartAt: item.session.scheduledStartAt,
            mentor: people.get(item.pair.mentorId),
            mentee: people.get(item.pair.menteeId),
        });
        const bestPairs = awards
            .map((award) => {
                const item = sessions.find(
                    (row) => row.session._id === award.sessionId,
                );
                return item && { rank: award.rank, ...pairView(item) };
            })
            .filter(Boolean);
        const inactivePairs = sessions
            .filter((item) => ["NO_SCHEDULE", "MISSING"].includes(item.status))
            .map(pairView);

        // Học tập
        const modules = await this.moduleModel.findAll({
            where: { isActive: true },
            order: [["sortOrder", "ASC"]],
            raw: true,
        });
        const submissions = await this.submissionModel.findAll({
            where: { periodId: period._id, status: SubmissionStatus.SUBMITTED },
            raw: true,
        });
        const learning = modules.map((module) => {
            const rows = submissions.filter(
                (row) => row.moduleId === module._id,
            );
            const scored = rows.filter(
                (row) =>
                    row.totalScore !== null && row.totalScore !== undefined,
            );
            return {
                module: {
                    _id: module._id,
                    code: module.code,
                    name: module.name,
                    cycleType: module.cycleType,
                },
                submissions: rows.length,
                approved: rows.filter(
                    (row) =>
                        row.reviewStatus === SubmissionReviewStatus.APPROVED,
                ).length,
                pending: rows.filter(
                    (row) =>
                        row.reviewStatus === SubmissionReviewStatus.PENDING,
                ).length,
                rejected: rows.filter(
                    (row) =>
                        row.reviewStatus === SubmissionReviewStatus.REJECTED,
                ).length,
                submitters: new Set(rows.map((row) => row.memberId)).size,
                averageScore: scored.length
                    ? round2(
                          scored.reduce(
                              (sum, row) => sum + Number(row.totalScore),
                              0,
                          ) / scored.length,
                      )
                    : null,
            };
        });

        // Quỹ
        const fund = await this.fundFlow.stats(period.code);

        // Điểm
        const summary = await this.pointFlow.getSummary(period.code);
        const ranked = summary.rows.filter(
            (row) => row.member?.memberType === MemberType.MENTEE,
        );
        const topMembers = ranked.slice(0, 5).map((row) => ({
            member: row.member,
            totalPoints: row.totalPoints,
            amount: row.amount,
        }));
        const topIds = new Set(topMembers.map((row) => row.member?._id));
        const needImprovement = [...ranked]
            .filter((row) => !topIds.has(row.member?._id))
            .sort((a, b) => a.totalPoints - b.totalPoints)
            .slice(0, 5)
            .map((row) => ({
                member: row.member,
                totalPoints: row.totalPoints,
                amount: row.amount,
            }));

        return {
            period: { ...period, isLocked: this.periodFlow.isLocked(period) },
            members: {
                total: members.length,
                mentees: mentees.length,
                mentors: members.length - mentees.length,
            },
            mentoring: {
                sessions: sessions.length,
                statusCount,
                doneRate: sessions.length
                    ? round2(((statusCount.DONE ?? 0) / sessions.length) * 100)
                    : 0,
                bestPairs,
                inactivePairs,
            },
            learning,
            fund: {
                totals: fund.totals,
                target: fund.target,
                byDate: fund.byDate.slice(0, 10),
            },
            points: { totals: summary.totals, topMembers, needImprovement },
            trend: await this.trend(period),
        };
    }

    /** 6 kỳ gần nhất tính tới kỳ đang xem */
    private async trend(period: Period) {
        const periods = (
            await this.periodModel.findAll({
                where: { code: { [Op.lte]: period.code } },
                order: [["code", "DESC"]],
                limit: 6,
                raw: true,
            })
        ).reverse();
        const ids = periods.map((item) => item._id);
        if (!ids.length) return [];
        const summaries = await this.summaryModel.findAll({
            where: { periodId: ids },
            raw: true,
        });
        const funds = await this.fundModel.findAll({
            where: { periodId: ids, status: FundContributionStatus.DONE },
            raw: true,
        });
        const submissions = await this.submissionModel.findAll({
            where: { periodId: ids, status: SubmissionStatus.SUBMITTED },
            attributes: ["periodId"],
            raw: true,
        });
        const result = [];
        for (const item of periods) {
            const sessions = await this.mentoringOf(item);
            result.push({
                period: item.code,
                totalPoints: round2(
                    summaries
                        .filter((row) => row.periodId === item._id)
                        .reduce((sum, row) => sum + Number(row.totalPoints), 0),
                ),
                totalAmount: round2(
                    summaries
                        .filter((row) => row.periodId === item._id)
                        .reduce((sum, row) => sum + Number(row.amount), 0),
                ),
                fundAmount: funds
                    .filter((row) => row.periodId === item._id)
                    .reduce((sum, row) => sum + Number(row.amount), 0),
                submissions: submissions.filter(
                    (row) => row.periodId === item._id,
                ).length,
                mentoringSessions: sessions.length,
                mentoringDone: sessions.filter((row) => row.status === "DONE")
                    .length,
            });
        }
        return result;
    }

    async me(user: User, code?: string) {
        const member = await this.memberModel.findOne({
            where: { userId: user._id },
            raw: true,
        });
        if (!member) throw ApiError.NotFound("error-member-not-linked");
        const period = await this.periodOf(code);
        const sessions = await this.mentoringOf(period, member._id);
        const people = await this.memberMap(
            sessions.flatMap((item) => [
                item.pair.mentorId,
                item.pair.menteeId,
            ]),
        );
        const awards = await this.awardModel.findAll({
            where: {
                periodId: period._id,
                sessionId: sessions.map((item) => item.session._id),
            },
            raw: true,
        });
        const points = await this.pointFlow.getMine(member, period.code);
        const fund = await this.fundFlow.getMine(user, period.code);
        const learning = await this.learningFlow.getMine(user);
        return {
            period: { ...period, isLocked: this.periodFlow.isLocked(period) },
            member: {
                _id: member._id,
                memberCode: member.memberCode,
                fullName: member.fullName,
                memberType: member.memberType,
            },
            mentoring: sessions.map((item) => {
                const isMentor = item.pair.mentorId === member._id;
                return {
                    sessionId: item.session._id,
                    code: item.session.code,
                    scheduledStartAt: item.session.scheduledStartAt,
                    recapDeadlineAt: item.session.recapDeadlineAt,
                    status: item.status,
                    myStatus: isMentor ? item.mentorStatus : item.menteeStatus,
                    partner: people.get(
                        isMentor ? item.pair.menteeId : item.pair.mentorId,
                    ),
                    awardRank:
                        awards.find(
                            (award) => award.sessionId === item.session._id,
                        )?.rank ?? null,
                };
            }),
            points: {
                totalPoints: Number(points.summary?.totalPoints ?? 0),
                amount: Number(points.summary?.amount ?? 0),
                entries: points.entries,
                history: points.history.slice(0, 6),
            },
            fund: {
                target: fund.target,
                approvedAmount: fund.approvedAmount,
                pendingAmount: fund.pendingAmount,
                reached: fund.reached,
                isEligible: fund.isEligible,
            },
            learning: learning.modules.map((module) => ({
                module: {
                    _id: module._id,
                    code: module.code,
                    name: module.name,
                    cycleType: module.cycleType,
                },
                currentCycle: module.currentCycle,
                pending: module.submissions.filter(
                    (row) =>
                        row.reviewStatus === SubmissionReviewStatus.PENDING,
                ).length,
                lastScore:
                    module.submissions.find((row) => row.totalScore !== null)
                        ?.totalScore ?? null,
            })),
        };
    }
}
