import { vnParts } from "@common/utils/vn-date.util";
import { ApiError } from "@config/exception/api-error";
import {
    rowsOfWeek,
    weekStatus,
    weeksOfPeriod,
} from "@module/fund/flow/fund-flow.service";
import { FundContributionModel } from "@module/fund/models/fund-contribution.model";
import {
    RECAP_MODULE_CODE,
    SubmissionReviewStatus,
    SubmissionStatus,
} from "@module/learning/common/constant";
import { cycleKeyOf } from "@module/learning/flow/learning-flow.service";
import { LearningModuleModel } from "@module/learning/models/learning-module.model";
import { SubmissionModel } from "@module/learning/models/submission.model";
import { TargetMemberType } from "@module/member/common/constant";
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
import { MentoringPairModel } from "@module/mentoring/models/mentoring-pair.model";
import { MentoringRecapModel } from "@module/mentoring/models/mentoring-recap.model";
import { MentoringSessionModel } from "@module/mentoring/models/mentoring-session.model";
import { GroupAccessService } from "@module/organization/flow/group-access.service";
import { PeriodFlowService } from "@module/period/flow/period-flow.service";
import { TimeService } from "@module/time/time.service";
import { SystemRole } from "@module/user/common/constant";
import { User } from "@module/user/entities/user.entity";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Op } from "sequelize";

/** Màn hình Leader/Phó nhóm: tiến độ các thành viên trong nhóm (không gồm dữ liệu nhạy cảm như số tài khoản) */
@Injectable()
export class LeaderService {
    constructor(
        private readonly timeService: TimeService,
        private readonly periodFlow: PeriodFlowService,
        private readonly groupAccess: GroupAccessService,
        @InjectModel(MemberModel)
        private readonly memberModel: typeof MemberModel,
        @InjectModel(MentoringSessionModel)
        private readonly sessionModel: typeof MentoringSessionModel,
        @InjectModel(MentoringPairModel)
        private readonly pairModel: typeof MentoringPairModel,
        @InjectModel(MentoringRecapModel)
        private readonly recapModel: typeof MentoringRecapModel,
        @InjectModel(LearningModuleModel)
        private readonly moduleModel: typeof LearningModuleModel,
        @InjectModel(SubmissionModel)
        private readonly submissionModel: typeof SubmissionModel,
        @InjectModel(FundContributionModel)
        private readonly fundModel: typeof FundContributionModel,
    ) {}

    /** Nhóm mà người dùng được xem (Admin: mọi nhóm) */
    private async myGroups(user: User) {
        const groups = await this.groupAccess.groups();
        if (user.systemRole === SystemRole.ADMIN)
            return groups.map((group) => ({
                ...group,
                role: "ADMIN" as const,
                canReview: true,
            }));
        const member = await this.groupAccess.memberOfUser(user);
        const leading = member
            ? await this.groupAccess.leadershipOf(member._id)
            : [];
        if (!leading.length) throw ApiError.Forbidden("error-forbidden");
        return leading.map((item) => ({
            ...groups.find((group) => group._id === item._id),
            role: item.role,
            canReview: item.canReview,
        }));
    }

    async overview(user: User, code?: string) {
        const now = this.timeService.now();
        const today = vnParts(now);
        const period = code
            ? await this.periodFlow.getByCode(code)
            : await this.periodFlow.ensurePeriod(today.year, today.month);
        const groups = await this.myGroups(user);
        const ids = groups.map((group) => group._id);
        const memberships = await this.groupAccess.currentMemberships(ids);
        const leaders = await this.groupAccess.leadersOf(ids);
        const memberIds = memberships.map((row) => row.memberId);
        const members = new Map(
            (
                await this.memberModel.findAll({
                    where: { _id: memberIds },
                    raw: true,
                })
            ).map((member) => [member._id, member]),
        );

        // Mentoring trong kỳ
        const pairs = memberIds.length
            ? await this.pairModel.findAll({
                  where: {
                      status: { [Op.ne]: MentoringPairStatus.CANCELLED },
                      [Op.or]: [
                          { mentorId: memberIds },
                          { menteeId: memberIds },
                      ],
                  },
                  raw: true,
              })
            : [];
        const sessions = pairs.length
            ? await this.sessionModel.findAll({
                  where: {
                      periodId: period._id,
                      pairId: pairs.map((pair) => pair._id),
                      status: MentoringSessionStatus.ACTIVE,
                  },
                  raw: true,
              })
            : [];
        const recaps = sessions.length
            ? await this.recapModel.findAll({
                  where: { sessionId: sessions.map((item) => item._id) },
                  raw: true,
              })
            : [];

        // Học tập: chu kỳ hiện tại của từng module (trừ module recap)
        const modules = (
            await this.moduleModel.findAll({
                where: { isActive: true, code: { [Op.ne]: RECAP_MODULE_CODE } },
                order: [["sortOrder", "ASC"]],
                raw: true,
            })
        ).map((module) => ({
            ...module,
            cycleKey: cycleKeyOf(module.cycleType, now),
        }));
        const submissions =
            memberIds.length && modules.length
                ? await this.submissionModel.findAll({
                      where: {
                          memberId: memberIds,
                          status: SubmissionStatus.SUBMITTED,
                          reviewStatus: {
                              [Op.ne]: SubmissionReviewStatus.REJECTED,
                          },
                          [Op.or]: modules.map((module) => ({
                              moduleId: module._id,
                              cycleKey: module.cycleKey,
                          })),
                      },
                      raw: true,
                  })
                : [];

        // Quỹ theo tuần
        const weeks = weeksOfPeriod(period);
        const contributions = memberIds.length
            ? await this.fundModel.findAll({
                  where: {
                      memberId: memberIds,
                      [Op.or]: [
                          { periodId: period._id },
                          {
                              coverUntil: { [Op.gte]: period.startDate },
                              contributionDate: { [Op.lte]: period.endDate },
                          },
                      ],
                  },
                  raw: true,
              })
            : [];

        const brief = (id?: string | null) => {
            const member = id ? members.get(id) : null;
            return member
                ? {
                      _id: member._id,
                      memberCode: member.memberCode,
                      fullName: member.fullName,
                      memberType: member.memberType,
                      phone: member.phone ?? null,
                      email: member.email ?? null,
                  }
                : null;
        };
        const memberRow = (memberId: string) => {
            const member = members.get(memberId);
            const myPairs = pairs.filter(
                (pair) =>
                    pair.mentorId === memberId || pair.menteeId === memberId,
            );
            const mentoring = sessions
                .filter((session) =>
                    myPairs.some((pair) => pair._id === session.pairId),
                )
                .map((session) => {
                    const pair = myPairs.find(
                        (item) => item._id === session.pairId,
                    );
                    const mentorRecap = recaps.find(
                        (recap) =>
                            recap.sessionId === session._id &&
                            recap.role === MentoringRole.MENTOR,
                    );
                    const menteeRecap = recaps.find(
                        (recap) =>
                            recap.sessionId === session._id &&
                            recap.role === MentoringRole.MENTEE,
                    );
                    const isMentor = pair.mentorId === memberId;
                    const own = isMentor ? mentorRecap : menteeRecap;
                    return {
                        sessionCode: session.code,
                        scheduledStartAt: session.scheduledStartAt ?? null,
                        pairStatus: pairRecapStatus(
                            session,
                            roleRecapStatus(session, mentorRecap, now),
                            roleRecapStatus(session, menteeRecap, now),
                        ),
                        myStatus: roleRecapStatus(session, own, now),
                        recapScore:
                            own?.score === null || own?.score === undefined
                                ? null
                                : Number(own.score),
                        partner:
                            brief(isMentor ? pair.menteeId : pair.mentorId) ??
                            null,
                    };
                });
            const learning = modules
                .filter((module) => {
                    const target =
                        module.targetMemberType ?? TargetMemberType.MENTEE;
                    return (
                        target === TargetMemberType.ALL ||
                        (target as string) === member?.memberType
                    );
                })
                .map((module) => {
                    const count = submissions.filter(
                        (row) =>
                            row.memberId === memberId &&
                            row.moduleId === module._id,
                    ).length;
                    const min = module.minSubmissionsPerCycle ?? 0;
                    return {
                        moduleId: module._id,
                        name: module.name,
                        cycleKey: module.cycleKey,
                        submitted: count,
                        min,
                        reached: count >= min,
                    };
                });
            const own = contributions.filter(
                (row) => row.memberId === memberId,
            );
            const fundWeeks = weeks.map((week) => ({
                weekKey: week.weekKey,
                status: weekStatus(rowsOfWeek(own, week.weekKey)),
            }));
            return {
                member: brief(memberId),
                mentoring,
                learning,
                fund: {
                    weeks: fundWeeks,
                    doneWeeks: fundWeeks.filter(
                        (week) => week.status === "DONE",
                    ).length,
                    pending: own.filter((row) => row.status === "PENDING")
                        .length,
                    approvedAmount: own
                        .filter(
                            (row) =>
                                row.periodId === period._id &&
                                row.status === "DONE",
                        )
                        .reduce((sum, row) => sum + Number(row.amount), 0),
                },
            };
        };
        return {
            period: { ...period, isLocked: this.periodFlow.isLocked(period) },
            weeks,
            groups: groups.map((group) => {
                const roles = leaders.get(group._id);
                const rows = memberships
                    .filter((row) => row.groupId === group._id)
                    .map((row) => memberRow(row.memberId))
                    .filter((row) => row.member);
                rows.sort(
                    (a, b) =>
                        a.member.memberType.localeCompare(
                            b.member.memberType,
                        ) ||
                        a.member.memberCode.localeCompare(b.member.memberCode),
                );
                return {
                    _id: group._id,
                    code: group.code,
                    name: group.name,
                    myRole: group.role,
                    canReview: group.canReview,
                    leader: brief(roles?.leaderId),
                    deputy: brief(roles?.deputyId),
                    members: rows,
                };
            }),
        };
    }
}
