import { vnDateKey, vnParts } from "@common/utils/vn-date.util";
import {
    coveredWeeks,
    weeksOwnedByMonth,
} from "@module/fund/flow/fund-weeks.util";
import { FundContributorModel } from "@module/fund/models/fund-contributor.model";
import { GroupMembershipModel } from "@module/organization/models/group-membership.model";
import { GroupKindConfigModel } from "@module/organization/models/group-kind-config.model";
import {
    DepartmentType,
    GroupKind,
} from "@module/organization/common/constant";
import { FundContributionStatus } from "@module/fund/common/constant";
import { FundContributionModel } from "@module/fund/models/fund-contribution.model";
import {
    CycleType,
    RECAP_MODULE_CODE,
    SubmissionReviewStatus,
    SubmissionStatus,
} from "@module/learning/common/constant";
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
        @InjectModel(GroupMembershipModel)
        private readonly membershipModel: typeof GroupMembershipModel,
        @InjectModel(FundContributorModel)
        private readonly contributorModel: typeof FundContributorModel,
        @InjectModel(GroupKindConfigModel)
        private readonly kindConfigModel: typeof GroupKindConfigModel,
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
            // Chỉ tính khi recap đã được duyệt (recap MTE được chấm điểm)
            if (recap.reviewStatus !== RecapReviewStatus.APPROVED) continue;
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
                    // Mốc: lần nộp của bản recap được duyệt (nộp lại sau khi bị trả thì tính từ lần nộp lại)
                    description: `${rule.name}: recap ${session.code} nộp lúc ${formatVn(recap.firstSubmittedAt)} (lần nộp được duyệt${recap.reviewedAt ? ` ${formatVn(recap.reviewedAt)}` : ""})`,
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
                // Barem xếp giải: điểm recap MTE (thang 100). Recap MTO chỉ duyệt, không có điểm
                const menteeScore =
                    mentee?.score === null || mentee?.score === undefined
                        ? null
                        : Number(mentee.score);
                const recapScore = menteeScore ?? 0;
                const unscored = menteeScore === null ? 1 : 0;
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
    /** Ngày chốt chức vụ / tỷ lệ hoàn tất: ngày cuối tháng, hoặc hôm nay nếu tháng chưa hết */
    private refDate(period: Period) {
        const today = vnDateKey(this.timeService.now());
        return today < period.endDate ? today : period.endDate;
    }

    /**
     * Người giữ chức vụ vào ngày chốt (đổi giữa tháng: tính cho người giữ vào ngày cuối tháng).
     * Mỗi nhóm/ban + chức vụ chỉ lấy 1 người (bản ghi bắt đầu muộn nhất nếu trùng ngày bàn giao).
     */
    private async positionHolders(period: Period, t: Transaction) {
        const ref = this.refDate(period);
        const rows = await this.memberPositionModel.findAll({
            where: {
                startDate: { [Op.lte]: ref },
                [Op.or]: [{ endDate: null }, { endDate: { [Op.gte]: ref } }],
            },
            order: [
                ["startDate", "DESC"],
                ["createdAt", "DESC"],
            ],
            raw: true,
            transaction: t,
        });
        const seen = new Set<string>();
        const holders = rows.filter((row) => {
            const key = `${row.departmentId}|${row.positionId}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
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
        return holders.map((row) => ({
            ...row,
            position: positions.get(row.positionId),
            department: departments.get(row.departmentId),
        }));
    }

    /** Phụ cấp chức vụ: Leader 2đ, Phó nhóm 1đ (mặc định), tính theo từng nhóm/ban đang giữ */
    private positionEntries(
        period: Period,
        rules: PointRule[],
        members: Map<string, Member>,
        holders: Awaited<
            ReturnType<PointCalculationService["positionHolders"]>
        >,
    ) {
        const positionRules = rules.filter(
            (rule) => rule.sourceType === PointSourceType.MEMBER_POSITION,
        );
        const entries: DesiredEntry[] = [];
        for (const holder of holders) {
            if (!this.roleMatchesGroup(holder)) continue;
            for (const rule of positionRules) {
                const conditions = (rule.conditions ?? {}) as Record<
                    string,
                    unknown
                >;
                // Rule chung: điểm lấy từ cấu hình vai trò; rule cũ theo mã chức vụ vẫn được hỗ trợ
                const fromRole = Boolean(conditions.fromRoleConfig);
                if (
                    !fromRole &&
                    conditions.positionCode !== holder.position?.code
                )
                    continue;
                const points = fromRole
                    ? Number(holder.position.allowancePoints ?? 0)
                    : Number(rule.points);
                if (!points) continue;
                if (!this.targets(rule, members.get(holder.memberId))) continue;
                entries.push({
                    _id: stableId(rule._id, holder._id, period._id),
                    periodId: period._id,
                    memberId: holder.memberId,
                    pointTypeId: rule.pointTypeId,
                    ruleId: rule._id,
                    points,
                    sourceType: PointSourceType.MEMBER_POSITION,
                    sourceId: holder._id,
                    description: `Phụ cấp chức vụ: ${holder.position.name} - ${holder.department?.name ?? ""}`,
                });
            }
        }
        return entries;
    }

    /**
     * Tỷ lệ hoàn tất của thành viên từng nhóm (theo số thành viên):
     * - Nhóm MTE: buổi mentoring của tháng "Đã xong" và recap MTE đã duyệt; đủ số bài tối thiểu
     *   của các module học tập theo tháng / theo tuần (tuần thuộc tháng theo ngày thứ Năm, đã kết thúc).
     * - Nhóm HLC Fund: mọi tuần của tháng (đã kết thúc) có khoản đóng được duyệt bao phủ (MTO và thầy cô).
     */
    private async groupCompletion(
        period: Period,
        mentoring: Awaited<
            ReturnType<PointCalculationService["mentoringSessions"]>
        >,
        now: Date,
        t: Transaction,
    ) {
        const ref = this.refDate(period);
        const groups = await this.departmentModel.findAll({
            where: { type: DepartmentType.GROUP },
            raw: true,
            transaction: t,
        });
        const result = new Map<string, { done: number; total: number }>();
        if (!groups.length) return result;
        const memberships = await this.membershipModel.findAll({
            where: {
                groupId: groups.map((group) => group._id),
                startDate: { [Op.lte]: ref },
                [Op.or]: [{ endDate: null }, { endDate: { [Op.gte]: ref } }],
            },
            raw: true,
            transaction: t,
        });
        const weeks = weeksOwnedByMonth(period).filter(
            (week) => week.endDate <= ref,
        );

        // Học tập
        const modules = (
            await this.moduleModel.findAll({
                where: { isActive: true, code: { [Op.ne]: RECAP_MODULE_CODE } },
                raw: true,
                transaction: t,
            })
        ).filter(
            (module) =>
                Number(module.minSubmissionsPerCycle ?? 0) > 0 &&
                [CycleType.MONTHLY, CycleType.WEEKLY].includes(
                    module.cycleType as CycleType,
                ),
        );
        const cycleKeys = [period.code, ...weeks.map((week) => week.weekKey)];
        const submissions = modules.length
            ? await this.submissionModel.findAll({
                  where: {
                      moduleId: modules.map((module) => module._id),
                      cycleKey: cycleKeys,
                      status: SubmissionStatus.SUBMITTED,
                      reviewStatus: {
                          [Op.ne]: SubmissionReviewStatus.REJECTED,
                      },
                  },
                  attributes: ["memberId", "moduleId", "cycleKey"],
                  raw: true,
                  transaction: t,
              })
            : [];
        const learningDone = (memberId: string, memberType: string) =>
            modules
                .filter((module) => {
                    const target =
                        module.targetMemberType ?? TargetMemberType.MENTEE;
                    return (
                        target === TargetMemberType.ALL ||
                        (target as string) === memberType
                    );
                })
                .every((module) => {
                    const keys =
                        module.cycleType === CycleType.MONTHLY
                            ? [period.code]
                            : weeks.map((week) => week.weekKey);
                    return keys.every(
                        (key) =>
                            submissions.filter(
                                (row) =>
                                    row.memberId === memberId &&
                                    row.moduleId === module._id &&
                                    row.cycleKey === key,
                            ).length >= Number(module.minSubmissionsPerCycle),
                    );
                });
        const mentoringDone = (memberId: string) =>
            mentoring.sessions
                .filter((session) => {
                    const pair = mentoring.pairMap.get(session.pairId);
                    return (
                        pair &&
                        (pair.menteeId === memberId ||
                            pair.mentorId === memberId)
                    );
                })
                .every((session) => {
                    const mentor = mentoring.recaps.find(
                        (recap) =>
                            recap.sessionId === session._id &&
                            recap.role === MentoringRole.MENTOR,
                    );
                    const mentee = mentoring.recaps.find(
                        (recap) =>
                            recap.sessionId === session._id &&
                            recap.role === MentoringRole.MENTEE,
                    );
                    return (
                        pairRecapStatus(
                            session,
                            roleRecapStatus(session, mentor, now),
                            roleRecapStatus(session, mentee, now),
                        ) === "DONE" &&
                        mentee?.reviewStatus === RecapReviewStatus.APPROVED
                    );
                });

        // Quỹ (nhóm HLC Fund)
        const fundGroupIds = groups
            .filter((group) => group.groupKind === GroupKind.FUND)
            .map((group) => group._id);
        const contributors = fundGroupIds.length
            ? await this.contributorModel.findAll({
                  where: { groupId: fundGroupIds, isActive: true },
                  raw: true,
                  transaction: t,
              })
            : [];
        const fundRows = await this.fundModel.findAll({
            where: {
                status: FundContributionStatus.DONE,
                contributionDate: { [Op.lte]: period.endDate },
                [Op.or]: [
                    { periodId: period._id },
                    { coverUntil: { [Op.gte]: period.startDate } },
                ],
            },
            raw: true,
            transaction: t,
        });
        const fundDone = (payer: {
            memberId?: string;
            contributorId?: string;
        }) => {
            if (!weeks.length) return null;
            const own = fundRows.filter((row) =>
                payer.contributorId
                    ? row.contributorId === payer.contributorId
                    : row.memberId === payer.memberId,
            );
            return weeks.every((week) =>
                own.some((row) => coveredWeeks(row).has(week.weekKey)),
            );
        };

        const memberTypes = new Map(
            (
                await this.memberModel.findAll({
                    attributes: ["_id", "memberType", "status"],
                    raw: true,
                    transaction: t,
                })
            ).map((member) => [member._id, member]),
        );
        for (const group of groups) {
            const ids = memberships
                .filter((row) => row.groupId === group._id)
                .map((row) => row.memberId)
                .filter(
                    (id) =>
                        memberTypes.get(id)?.status !== MemberStatus.INACTIVE,
                );
            let done = 0;
            let total = 0;
            if (group.groupKind === GroupKind.FUND) {
                for (const payer of [
                    ...ids.map((memberId) => ({ memberId })),
                    ...contributors
                        .filter((item) => item.groupId === group._id)
                        .map((item) => ({ contributorId: item._id })),
                ]) {
                    const value = fundDone(payer);
                    if (value === null) continue;
                    total += 1;
                    if (value) done += 1;
                }
            } else {
                for (const memberId of ids) {
                    total += 1;
                    if (
                        mentoringDone(memberId) &&
                        learningDone(
                            memberId,
                            memberTypes.get(memberId)?.memberType,
                        )
                    )
                        done += 1;
                }
            }
            result.set(group._id, { done, total });
        }
        return result;
    }

    /** Thưởng cuối tháng +1 cho Leader / Phó nhóm khi tỷ lệ hoàn tất của nhóm vượt ngưỡng (mặc định trên 90%) */
    private completionEntries(
        period: Period,
        rules: PointRule[],
        members: Map<string, Member>,
        holders: Awaited<
            ReturnType<PointCalculationService["positionHolders"]>
        >,
        completion: Map<string, { done: number; total: number }>,
        thresholds: Record<string, number>,
    ) {
        const bonusRules = rules.filter(
            (rule) => rule.sourceType === PointSourceType.GROUP_COMPLETION,
        );
        const entries: DesiredEntry[] = [];
        for (const holder of holders) {
            const stats = completion.get(holder.departmentId);
            if (!stats?.total) continue;
            if (!this.roleMatchesGroup(holder)) continue;
            const rate = stats.done / stats.total;
            const kind = holder.department?.groupKind ?? GroupKind.MENTEE;
            for (const rule of bonusRules) {
                const conditions = (rule.conditions ?? {}) as Record<
                    string,
                    unknown
                >;
                const fromRole = Boolean(conditions.fromRoleConfig);
                if (
                    !fromRole &&
                    conditions.positionCode !== holder.position?.code
                )
                    continue;
                // Ngưỡng % theo loại nhóm (Admin cấu hình); thưởng khi VƯỢT ngưỡng
                const threshold = fromRole
                    ? (thresholds[kind] ?? 90) / 100
                    : Number(conditions.minCompletionRate ?? 0.9);
                if (rate <= threshold) continue;
                const points = fromRole
                    ? Number(holder.position.bonusPoints ?? 0)
                    : Number(rule.points);
                if (!points) continue;
                if (!this.targets(rule, members.get(holder.memberId))) continue;
                entries.push({
                    _id: stableId(
                        rule._id,
                        holder.departmentId,
                        holder.memberId,
                        period._id,
                    ),
                    periodId: period._id,
                    memberId: holder.memberId,
                    pointTypeId: rule.pointTypeId,
                    ruleId: rule._id,
                    points,
                    sourceType: PointSourceType.GROUP_COMPLETION,
                    sourceId: holder.departmentId,
                    description: `Thưởng đạt tỷ lệ: ${holder.position.name} - ${holder.department?.name ?? ""}, hoàn thành ${stats.done}/${stats.total} (${Math.round(rate * 100)}%) vượt ngưỡng ${Math.round(threshold * 100)}%`,
                });
            }
        }
        return entries;
    }

    /** Vai trò thuộc nhóm phải đúng loại nhóm (vai trò nhóm MTE không tính cho nhóm HLC Fund và ngược lại) */
    private roleMatchesGroup(holder: {
        position?: { groupKind?: string | null };
        department?: { type?: string; groupKind?: string | null };
    }) {
        if (holder.department?.type !== DepartmentType.GROUP)
            return !holder.position?.groupKind;
        return (
            !holder.position?.groupKind ||
            holder.position.groupKind ===
                (holder.department.groupKind ?? GroupKind.MENTEE)
        );
    }

    /** Ngưỡng % hoàn thành theo loại nhóm */
    async thresholds(t?: Transaction) {
        const rows = await this.kindConfigModel.findAll({
            raw: true,
            transaction: t,
        });
        return Object.fromEntries(
            Object.values(GroupKind).map((kind) => [
                kind,
                Number(
                    rows.find((row) => row.groupKind === kind)
                        ?.completionThreshold ?? 90,
                ),
            ]),
        );
    }

    /** Tỷ lệ hoàn tất từng nhóm (dùng cho màn hình) */
    async completionOf(period: Period, t: Transaction) {
        const mentoring = await this.mentoringSessions(period, t);
        return this.groupCompletion(
            period,
            mentoring,
            this.timeService.now(),
            t,
        );
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
        const holders = await this.positionHolders(period, t);
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
                ...this.positionEntries(period, rules, members, holders),
                ...this.completionEntries(
                    period,
                    rules,
                    members,
                    holders,
                    await this.groupCompletion(period, mentoring, now, t),
                    await this.thresholds(t),
                ),
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
