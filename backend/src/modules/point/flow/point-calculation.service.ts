import { vnParts } from "@common/utils/vn-date.util";
import { FundContributionStatus } from "@module/fund/common/constant";
import { FundContributionModel } from "@module/fund/models/fund-contribution.model";
import { SubmissionReviewStatus } from "@module/learning/common/constant";
import { LearningModuleModel } from "@module/learning/models/learning-module.model";
import { SubmissionModel } from "@module/learning/models/submission.model";
import { MemberStatus, TargetMemberType } from "@module/member/common/constant";
import { Member } from "@module/member/entities/member.entity";
import { MemberModel } from "@module/member/models/member.model";
import {
    MentoringPairStatus,
    MentoringRole,
    MentoringSessionStatus,
    RecapReviewStatus,
} from "@module/mentoring/common/constant";
import {
    pairRecapStatus,
    roleRecapStatus,
} from "@module/mentoring/flow/mentoring-rules";
import { MentoringAwardModel } from "@module/mentoring/models/mentoring-award.model";
import { MentoringPairModel } from "@module/mentoring/models/mentoring-pair.model";
import { MentoringRecapModel } from "@module/mentoring/models/mentoring-recap.model";
import { MentoringSessionModel } from "@module/mentoring/models/mentoring-session.model";
import { MemberPositionModel } from "@module/organization/models/member-position.model";
import { PositionModel } from "@module/organization/models/position.model";
import { DepartmentModel } from "@module/organization/models/department.model";
import { Period } from "@module/period/entities/period.entity";
import { TimeService } from "@module/time/time.service";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { createHash } from "crypto";
import { Op, Transaction } from "sequelize";
import { PointEntryStatus, PointSourceType } from "../common/constant";
import { PointRule } from "../entities/point-rule.entity";
import { PointEntryModel } from "../models/point-entry.model";
import { PointRuleModel } from "../models/point-rule.model";

export interface DesiredEntry {
    _id: string;
    periodId: string;
    memberId: string;
    pointTypeId: string;
    ruleId: string;
    points: number;
    sourceType: PointSourceType;
    sourceId: string;
    description: string;
}

/** _id tất định (24 ký tự hex) để tính lại không sinh dòng trùng */
export const stableId = (...parts: string[]) =>
    createHash("md5").update(parts.join("|")).digest("hex").slice(0, 24);

const formatVn = (value: Date | string) => {
    const date = new Date(new Date(value).getTime() + 7 * 3600_000);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
};
const money = (value: number) =>
    `${Math.round(value).toLocaleString("vi-VN")}đ`;

@Injectable()
export class PointCalculationService {
    /** Số recap của các cặp "Đã xong" chưa được chấm ở lần xếp giải gần nhất */
    private lastUnscoredRecaps = 0;

    constructor(
        private readonly timeService: TimeService,
        @InjectModel(PointRuleModel)
        private readonly ruleModel: typeof PointRuleModel,
        @InjectModel(PointEntryModel)
        private readonly entryModel: typeof PointEntryModel,
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
        @InjectModel(FundContributionModel)
        private readonly fundModel: typeof FundContributionModel,
        @InjectModel(MemberPositionModel)
        private readonly memberPositionModel: typeof MemberPositionModel,
        @InjectModel(PositionModel)
        private readonly positionModel: typeof PositionModel,
        @InjectModel(DepartmentModel)
        private readonly departmentModel: typeof DepartmentModel,
        @InjectModel(SubmissionModel)
        private readonly submissionModel: typeof SubmissionModel,
        @InjectModel(LearningModuleModel)
        private readonly moduleModel: typeof LearningModuleModel,
    ) {}

    /** Rule đang bật và có hiệu lực ít nhất 1 ngày trong kỳ */
    private async activeRules(period: Period, t: Transaction) {
        const rules = await this.ruleModel.findAll({
            where: { isActive: true },
            transaction: t,
        });
        return rules
            .map((rule) => rule.get({ plain: true }) as PointRule)
            .filter(
                (rule) =>
                    (!rule.effectiveFrom ||
                        rule.effectiveFrom <= period.endDate) &&
                    (!rule.effectiveTo ||
                        rule.effectiveTo >= period.startDate) &&
                    Number(rule.points) !== 0,
            );
    }

    private targets(rule: PointRule, member?: Pick<Member, "memberType">) {
        const target = rule.targetMemberType ?? TargetMemberType.MENTEE;
        return (
            Boolean(member) &&
            (target === TargetMemberType.ALL ||
                (target as string) === member.memberType)
        );
    }

    /** Mỗi bản ghi gốc chỉ nhận 1 rule trong cùng exclusiveGroup (rule có priority cao nhất) */
    private pickExclusive(
        candidates: (DesiredEntry & {
            group: string | null;
            priority: number;
        })[],
    ) {
        const chosen = new Map<
            string,
            DesiredEntry & { group: string | null; priority: number }
        >();
        const result: (DesiredEntry & {
            group: string | null;
            priority: number;
        })[] = [];
        for (const candidate of candidates) {
            if (!candidate.group) {
                result.push(candidate);
                continue;
            }
            const key = `${candidate.sourceType}|${candidate.sourceId}|${candidate.memberId}|${candidate.group}`;
            const current = chosen.get(key);
            if (!current || candidate.priority > current.priority)
                chosen.set(key, candidate);
        }
        return [...result, ...chosen.values()].map(
            ({ group, priority, ...entry }) => {
                void group;
                void priority;
                return entry;
            },
        );
    }

    /** Giới hạn tổng điểm của một rule cho mỗi thành viên trong kỳ */
    private applyCaps(entries: DesiredEntry[], rules: PointRule[]) {
        const capByRule = new Map(
            rules
                .filter((rule) => rule.maxPointsPerPeriod)
                .map((rule) => [rule._id, Number(rule.maxPointsPerPeriod)]),
        );
        const used = new Map<string, number>();
        const result: DesiredEntry[] = [];
        for (const entry of [...entries].sort((a, b) =>
            a.sourceId.localeCompare(b.sourceId),
        )) {
            const cap = capByRule.get(entry.ruleId);
            if (!cap) {
                result.push(entry);
                continue;
            }
            const key = `${entry.ruleId}|${entry.memberId}`;
            const remaining = cap - (used.get(key) ?? 0);
            if (remaining <= 0) continue;
            const points = Math.min(entry.points, remaining);
            used.set(key, (used.get(key) ?? 0) + points);
            result.push({ ...entry, points });
        }
        return result;
    }

    // ------------------------------------------------------------------
    // Nguồn điểm
    // ------------------------------------------------------------------

    private async mentoringSessions(period: Period, t: Transaction) {
        const sessions = await this.sessionModel.findAll({
            where: {
                periodId: period._id,
                status: MentoringSessionStatus.ACTIVE,
            },
            raw: true,
            transaction: t,
        });
        const pairs = sessions.length
            ? await this.pairModel.findAll({
                  where: {
                      _id: sessions.map((item) => item.pairId),
                      status: { [Op.ne]: MentoringPairStatus.CANCELLED },
                  },
                  raw: true,
                  transaction: t,
              })
            : [];
        const pairMap = new Map(pairs.map((pair) => [pair._id, pair]));
        const activeSessions = sessions.filter((session) =>
            pairMap.has(session.pairId),
        );
        const recaps = activeSessions.length
            ? await this.recapModel.findAll({
                  where: { sessionId: activeSessions.map((item) => item._id) },
                  raw: true,
                  transaction: t,
              })
            : [];
        return { sessions: activeSessions, pairMap, recaps };
    }

    /** Mentoring sớm: lần nộp recap đầu tiên rơi vào khoảng ngày của rule (giờ VN) trong tháng của buổi */
    private earlyRecapEntries(
        period: Period,
        rules: PointRule[],
        data: Awaited<ReturnType<PointCalculationService["mentoringSessions"]>>,
        members: Map<string, Member>,
        now: Date,
    ) {
        const recapRules = rules.filter(
            (rule) => rule.sourceType === PointSourceType.MENTORING_RECAP,
        );
        const sessionMap = new Map(
            data.sessions.map((session) => [session._id, session]),
        );
        const candidates: (DesiredEntry & {
            group: string | null;
            priority: number;
        })[] = [];
        for (const recap of data.recaps) {
            if (recap.reviewStatus === RecapReviewStatus.REJECTED) continue;
            if (new Date(recap.firstSubmittedAt) > now) continue;
            const session = sessionMap.get(recap.sessionId);
            const local = vnParts(new Date(recap.firstSubmittedAt));
            if (
                !session ||
                local.year !== period.year ||
                local.month !== period.month
            )
                continue;
            for (const rule of recapRules) {
                const conditions = (rule.conditions ?? {}) as Record<
                    string,
                    unknown
                >;
                if (conditions.recapRole && conditions.recapRole !== recap.role)
                    continue;
                const from = Number(conditions.submittedDayFrom ?? 1);
                const to = Number(conditions.submittedDayTo ?? 31);
                if (local.day < from || local.day > to) continue;
                if (!this.targets(rule, members.get(recap.memberId))) continue;
                candidates.push({
                    _id: stableId(rule._id, recap._id, recap.memberId),
                    periodId: period._id,
                    memberId: recap.memberId,
                    pointTypeId: rule.pointTypeId,
                    ruleId: rule._id,
                    points: Number(rule.points),
                    sourceType: PointSourceType.MENTORING_RECAP,
                    sourceId: recap._id,
                    description: `${rule.name}: recap ${session.code} nộp lúc ${formatVn(recap.firstSubmittedAt)}`,
                    group: rule.exclusiveGroup ?? null,
                    priority: Number(rule.priority ?? 0),
                });
            }
        }
        return this.pickExclusive(candidates);
    }

    /**
     * Xếp giải nhất/nhì/ba của tháng: chỉ cặp "Đã xong" (cả 2 nộp đúng hạn),
     * buổi càng sớm càng cao; hòa thì cặp hoàn tất recap trước; cuối cùng theo mã. Không đồng giải.
     * Ghi lại bảng MentoringAward (trừ khi kỳ đã khóa).
     */
    private async rankAwards(
        period: Period,
        data: Awaited<ReturnType<PointCalculationService["mentoringSessions"]>>,
        now: Date,
        userId: string,
        t: Transaction,
    ) {
        const ranked = data.sessions
            .map((session) => {
                const mentor = data.recaps.find(
                    (recap) =>
                        recap.sessionId === session._id &&
                        recap.role === MentoringRole.MENTOR,
                );
                const mentee = data.recaps.find(
                    (recap) =>
                        recap.sessionId === session._id &&
                        recap.role === MentoringRole.MENTEE,
                );
                const status = pairRecapStatus(
                    session,
                    roleRecapStatus(session, mentor, now),
                    roleRecapStatus(session, mentee, now),
                );
                const completedAt =
                    mentor && mentee
                        ? Math.max(
                              new Date(mentor.firstSubmittedAt).getTime(),
                              new Date(mentee.firstSubmittedAt).getTime(),
                          )
                        : null;
                // Điểm chất lượng recap (thang 100) do Leader/admin chấm; chưa chấm tính 0
                const scores = [mentor, mentee].map((recap) =>
                    recap?.score === null || recap?.score === undefined
                        ? null
                        : Number(recap.score),
                );
                const recapScore =
                    Math.round(((scores[0] ?? 0) + (scores[1] ?? 0)) * 50) /
                    100;
                const unscored = scores.filter(
                    (value) => value === null,
                ).length;
                return { session, status, completedAt, recapScore, unscored };
            })
            .filter((item) => item.status === "DONE");
        this.lastUnscoredRecaps = ranked.reduce(
            (sum, item) => sum + item.unscored,
            0,
        );
        ranked.sort(
            (a, b) =>
                b.recapScore - a.recapScore ||
                new Date(a.session.scheduledStartAt).getTime() -
                    new Date(b.session.scheduledStartAt).getTime() ||
                a.completedAt - b.completedAt ||
                a.session.code.localeCompare(b.session.code),
        );
        ranked.splice(3);
        await this.awardModel.destroy({
            where: { periodId: period._id },
            transaction: t,
        });
        const awards = [];
        for (const [index, item] of ranked.entries()) {
            const award = await this.awardModel.create(
                {
                    _id: stableId("AWARD", period._id, item.session._id),
                    periodId: period._id,
                    sessionId: item.session._id,
                    rank: index + 1,
                    rankingBasis: {
                        recapScore: item.recapScore,
                        scheduledStartAt: item.session.scheduledStartAt,
                        completedAt: item.completedAt
                            ? new Date(item.completedAt)
                            : null,
                    },
                    decidedBy: userId,
                    decidedAt: now,
                },
                { transaction: t },
            );
            awards.push({
                award: award.get({ plain: true }),
                session: item.session,
                recapScore: item.recapScore,
            });
        }
        return awards;
    }

    private awardEntries(
        period: Period,
        rules: PointRule[],
        awards: Awaited<ReturnType<PointCalculationService["rankAwards"]>>,
        data: Awaited<ReturnType<PointCalculationService["mentoringSessions"]>>,
        members: Map<string, Member>,
    ) {
        const entries: DesiredEntry[] = [];
        for (const { award, session } of awards) {
            const pair = data.pairMap.get(session.pairId);
            for (const rule of rules.filter(
                (item) => item.sourceType === PointSourceType.MENTORING_AWARD,
            )) {
                if (Number((rule.conditions ?? {}).rank) !== award.rank)
                    continue;
                for (const memberId of [pair.menteeId, pair.mentorId]) {
                    if (!this.targets(rule, members.get(memberId))) continue;
                    entries.push({
                        _id: stableId(rule._id, award._id, memberId),
                        periodId: period._id,
                        memberId,
                        pointTypeId: rule.pointTypeId,
                        ruleId: rule._id,
                        points: Number(rule.points),
                        sourceType: PointSourceType.MENTORING_AWARD,
                        sourceId: award._id,
                        description: `${rule.name}: cặp ${session.code} (giải ${award.rank})`,
                    });
                }
            }
        }
        return entries;
    }

    /** Đóng quỹ: tổng tiền minh chứng đã duyệt trong kỳ >= minApprovedAmount */
    private async fundEntries(
        period: Period,
        rules: PointRule[],
        members: Map<string, Member>,
        t: Transaction,
    ) {
        const fundRules = rules.filter(
            (rule) => rule.sourceType === PointSourceType.FUND_MONTHLY,
        );
        if (!fundRules.length) return [];
        const contributions = await this.fundModel.findAll({
            where: {
                periodId: period._id,
                status: FundContributionStatus.DONE,
            },
            raw: true,
            transaction: t,
        });
        const totals = new Map<string, number>();
        contributions.forEach((item) =>
            totals.set(
                item.memberId,
                (totals.get(item.memberId) ?? 0) + Number(item.amount),
            ),
        );
        const entries: DesiredEntry[] = [];
        for (const [memberId, total] of totals) {
            for (const rule of fundRules) {
                const minimum = Number(
                    (rule.conditions ?? {}).minApprovedAmount ?? 0,
                );
                if (
                    total < minimum ||
                    !this.targets(rule, members.get(memberId))
                )
                    continue;
                entries.push({
                    _id: stableId(rule._id, period._id, memberId),
                    periodId: period._id,
                    memberId,
                    pointTypeId: rule.pointTypeId,
                    ruleId: rule._id,
                    points: Number(rule.points),
                    sourceType: PointSourceType.FUND_MONTHLY,
                    sourceId: period._id,
                    description: `${rule.name}: đã duyệt ${money(total)} / mức ${money(minimum)}`,
                });
            }
        }
        return entries;
    }

    /** Phụ cấp chức vụ: chức vụ còn hiệu lực ít nhất 1 ngày trong kỳ */
    private async positionEntries(
        period: Period,
        rules: PointRule[],
        members: Map<string, Member>,
        t: Transaction,
    ) {
        const positionRules = rules.filter(
            (rule) => rule.sourceType === PointSourceType.MEMBER_POSITION,
        );
        if (!positionRules.length) return [];
        const assignments = await this.memberPositionModel.findAll({
            where: {
                startDate: { [Op.lte]: period.endDate },
                [Op.or]: [
                    { endDate: null },
                    { endDate: { [Op.gte]: period.startDate } },
                ],
            },
            raw: true,
            transaction: t,
        });
        const positions = new Map(
            (
                await this.positionModel.findAll({ raw: true, transaction: t })
            ).map((item) => [item._id, item]),
        );
        const departments = new Map(
            (
                await this.departmentModel.findAll({
                    raw: true,
                    transaction: t,
                })
            ).map((item) => [item._id, item]),
        );
        const entries: DesiredEntry[] = [];
        for (const assignment of assignments) {
            const position = positions.get(assignment.positionId);
            for (const rule of positionRules) {
                if ((rule.conditions ?? {}).positionCode !== position?.code)
                    continue;
                if (!this.targets(rule, members.get(assignment.memberId)))
                    continue;
                entries.push({
                    _id: stableId(rule._id, assignment._id, period._id),
                    periodId: period._id,
                    memberId: assignment.memberId,
                    pointTypeId: rule.pointTypeId,
                    ruleId: rule._id,
                    points: Number(rule.points),
                    sourceType: PointSourceType.MEMBER_POSITION,
                    sourceId: assignment._id,
                    description: `${rule.name}: ${position.name} - ${departments.get(assignment.departmentId)?.name ?? ""}`,
                });
            }
        }
        return entries;
    }

    /** Bài nộp được duyệt (rule tùy chọn): conditions.moduleCode, conditions.minScore */
    private async submissionEntries(
        period: Period,
        rules: PointRule[],
        members: Map<string, Member>,
        t: Transaction,
    ) {
        const submissionRules = rules.filter(
            (rule) => rule.sourceType === PointSourceType.SUBMISSION,
        );
        if (!submissionRules.length) return [];
        const submissions = await this.submissionModel.findAll({
            where: {
                periodId: period._id,
                reviewStatus: SubmissionReviewStatus.APPROVED,
            },
            raw: true,
            transaction: t,
        });
        const modules = new Map(
            (await this.moduleModel.findAll({ raw: true, transaction: t })).map(
                (item) => [item._id, item],
            ),
        );
        const entries: DesiredEntry[] = [];
        for (const submission of submissions) {
            const module = modules.get(submission.moduleId);
            for (const rule of submissionRules) {
                const conditions = (rule.conditions ?? {}) as Record<
                    string,
                    unknown
                >;
                if (
                    conditions.moduleCode &&
                    conditions.moduleCode !== module?.code
                )
                    continue;
                if (
                    conditions.minScore !== undefined &&
                    Number(submission.totalScore ?? -1) <
                        Number(conditions.minScore)
                )
                    continue;
                if (!this.targets(rule, members.get(submission.memberId)))
                    continue;
                entries.push({
                    _id: stableId(
                        rule._id,
                        submission._id,
                        submission.memberId,
                    ),
                    periodId: period._id,
                    memberId: submission.memberId,
                    pointTypeId: rule.pointTypeId,
                    ruleId: rule._id,
                    points: Number(rule.points),
                    sourceType: PointSourceType.SUBMISSION,
                    sourceId: submission._id,
                    description: `${rule.name}: ${module?.name ?? ""} (${submission.cycleKey})`,
                });
            }
        }
        return entries;
    }

    // ------------------------------------------------------------------
    // Tính lại
    // ------------------------------------------------------------------

    /** Tính lại toàn bộ điểm hệ thống của kỳ (gọi trong transaction, kỳ phải chưa khóa) */
    async recalculate(period: Period, userId: string, t: Transaction) {
        const now = this.timeService.now();
        const rules = await this.activeRules(period, t);
        const members = new Map(
            (await this.memberModel.findAll({ raw: true, transaction: t })).map(
                (member) => [member._id, member as Member],
            ),
        );
        const mentoring = await this.mentoringSessions(period, t);
        const awards = await this.rankAwards(period, mentoring, now, userId, t);
        const desired = this.applyCaps(
            [
                ...this.earlyRecapEntries(
                    period,
                    rules,
                    mentoring,
                    members,
                    now,
                ),
                ...this.awardEntries(period, rules, awards, mentoring, members),
                ...(await this.fundEntries(period, rules, members, t)),
                ...(await this.positionEntries(period, rules, members, t)),
                ...(await this.submissionEntries(period, rules, members, t)),
            ].filter(
                (entry) =>
                    members.get(entry.memberId)?.status !==
                    MemberStatus.INACTIVE,
            ),
            rules,
        );

        const existing = await this.entryModel.findAll({
            where: { periodId: period._id, ruleId: { [Op.ne]: null } },
            transaction: t,
        });
        const existingMap = new Map(
            existing.map((entry) => [entry._id, entry]),
        );
        const desiredIds = new Set(desired.map((entry) => entry._id));
        const stats = {
            created: 0,
            reactivated: 0,
            updated: 0,
            voided: 0,
            unchanged: 0,
        };
        for (const entry of desired) {
            const current = existingMap.get(entry._id);
            if (!current) {
                await this.entryModel.create(
                    { ...entry, status: PointEntryStatus.ACTIVE },
                    { transaction: t },
                );
                stats.created += 1;
            } else if (current.status === PointEntryStatus.VOID) {
                await current.update(
                    {
                        ...entry,
                        status: PointEntryStatus.ACTIVE,
                        voidReason: null,
                        voidedAt: null,
                        voidedBy: null,
                    },
                    { transaction: t },
                );
                stats.reactivated += 1;
            } else if (
                Number(current.points) !== entry.points ||
                current.description !== entry.description
            ) {
                await current.update(
                    { points: entry.points, description: entry.description },
                    { transaction: t },
                );
                stats.updated += 1;
            } else {
                stats.unchanged += 1;
            }
        }
        for (const entry of existing) {
            if (
                entry.status === PointEntryStatus.ACTIVE &&
                !desiredIds.has(entry._id)
            ) {
                await entry.update(
                    {
                        status: PointEntryStatus.VOID,
                        voidReason: "Không còn thỏa điều kiện khi tính lại",
                        voidedAt: now,
                        voidedBy: userId,
                    },
                    { transaction: t },
                );
                stats.voided += 1;
            }
        }
        return {
            ...stats,
            awards: awards.map(({ award, session, recapScore }) => ({
                rank: award.rank,
                sessionCode: session.code,
                recapScore,
            })),
            unscoredRecaps: this.lastUnscoredRecaps,
        };
    }
}
