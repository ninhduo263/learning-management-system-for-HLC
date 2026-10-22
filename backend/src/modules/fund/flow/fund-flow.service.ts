import { isValidDateKey, vnDateKey, vnParts } from "@common/utils/vn-date.util";
import { ApiError } from "@config/exception/api-error";
import { AttachmentFlowService } from "@module/attachment/attachment-flow.service";
import { AttachmentOwnerType } from "@module/attachment/common/constant";
import { MemberStatus, MemberType } from "@module/member/common/constant";
import { Member } from "@module/member/entities/member.entity";
import { MemberModel } from "@module/member/models/member.model";
import { PeriodFlowService } from "@module/period/flow/period-flow.service";
import { PointRuleModel } from "@module/point/models/point-rule.model";
import { PointSourceType } from "@module/point/common/constant";
import { TimeService } from "@module/time/time.service";
import { User } from "@module/user/entities/user.entity";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Op, WhereOptions } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import { FundContributionStatus } from "../common/constant";
import { FundContribution } from "../entities/fund-contribution.entity";
import { FundContributionModel } from "../models/fund-contribution.model";
import { GroupAccessService } from "@module/organization/flow/group-access.service";
import { AdminScope } from "@module/permission/common/constant";
import { AdminPermissionModel } from "@module/permission/models/admin-permission.model";
import { SystemRole } from "@module/user/common/constant";
import { vnIsoWeekKey } from "@common/utils/vn-date.util";
import { Period } from "@module/period/entities/period.entity";

export type WeekStatus = "NONE" | FundContributionStatus;

/** Các tuần ISO giao với tháng (cắt theo đầu/cuối tháng) */
export function weeksOfPeriod(period: Pick<Period, "year" | "month">) {
    const lastDay = new Date(
        Date.UTC(period.year, period.month, 0),
    ).getUTCDate();
    const weeks: { weekKey: string; from: string; to: string }[] = [];
    for (let day = 1; day <= lastDay; day += 1) {
        const date = `${period.year}-${String(period.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const weekKey = weekOfDate(date);
        const current = weeks[weeks.length - 1];
        if (current?.weekKey === weekKey) current.to = date;
        else weeks.push({ weekKey, from: date, to: date });
    }
    return weeks;
}

/** Tuần ISO của ngày YYYY-MM-DD */
export const weekOfDate = (date: string) =>
    vnIsoWeekKey(new Date(`${date}T12:00:00+07:00`));

/** Trạng thái tuần: Đã xong nếu có minh chứng được duyệt; Chờ nếu đang chờ; Chưa xong nếu chỉ có minh chứng bị từ chối */
export function weekStatus(rows: { status?: string }[]): WeekStatus {
    if (rows.some((row) => row.status === FundContributionStatus.DONE))
        return FundContributionStatus.DONE;
    if (rows.some((row) => row.status === FundContributionStatus.PENDING))
        return FundContributionStatus.PENDING;
    if (rows.length) return FundContributionStatus.NOT_DONE;
    return "NONE";
}
import { ContributionDto } from "./dto/contribution.dto";

export interface ContributionQuery {
    period?: string;
    date?: string;
    status?: FundContributionStatus;
    memberId?: string;
}

@Injectable()
export class FundFlowService {
    constructor(
        private readonly sequelize: Sequelize,
        private readonly timeService: TimeService,
        private readonly periodFlow: PeriodFlowService,
        private readonly attachments: AttachmentFlowService,
        private readonly groupAccess: GroupAccessService,
        @InjectModel(AdminPermissionModel)
        private readonly permissionModel: typeof AdminPermissionModel,
        @InjectModel(FundContributionModel)
        private readonly contributionModel: typeof FundContributionModel,
        @InjectModel(MemberModel)
        private readonly memberModel: typeof MemberModel,
        @InjectModel(PointRuleModel)
        private readonly ruleModel: typeof PointRuleModel,
    ) {}

    async memberOf(user: User) {
        const member = await this.memberModel.findOne({
            where: { userId: user._id },
            raw: true,
        });
        if (!member) throw ApiError.NotFound("error-member-not-linked");
        return member;
    }

    /** Mức tiền tối thiểu theo rule FUND_MONTHLY đang bật */
    async monthlyTarget() {
        const rule = await this.ruleModel.findOne({
            where: { sourceType: PointSourceType.FUND_MONTHLY, isActive: true },
            order: [["priority", "DESC"]],
            raw: true,
        });
        return {
            minApprovedAmount: Number(
                (rule?.conditions as Record<string, unknown>)
                    ?.minApprovedAmount ?? 150000,
            ),
            points: Number(rule?.points ?? 0),
        };
    }

    private async views(rows: FundContribution[]) {
        const files = await this.attachments.listFor(
            AttachmentOwnerType.FUND_CONTRIBUTION,
            rows.map((row) => row._id),
        );
        const members = new Map(
            (
                await this.memberModel.findAll({
                    where: {
                        _id: [...new Set(rows.map((row) => row.memberId))],
                    },
                    raw: true,
                })
            ).map((member) => [member._id, member]),
        );
        return rows.map((row) => {
            const member = members.get(row.memberId);
            return {
                ...row,
                amount: Number(row.amount),
                files: files.get(row._id) ?? [],
                member: member && {
                    _id: member._id,
                    memberCode: member.memberCode,
                    fullName: member.fullName,
                    memberType: member.memberType,
                },
            };
        });
    }

    private validateDate(date: string) {
        const today = vnDateKey(this.timeService.now());
        if (!isValidDateKey(date) || date > today)
            throw ApiError.BadRequest("error-fund-date-invalid");
        const [year, month] = date.split("-").map(Number);
        return { year, month };
    }

    // ------------------------------------------------------------------
    // Thành viên
    // ------------------------------------------------------------------

    async submit(user: User, dto: ContributionDto, id?: string) {
        const member = await this.memberOf(user);
        const { year, month } = this.validateDate(dto.contributionDate);
        await this.attachments.loadFiles(dto.fileIds, { requireImage: true });
        const contributionId = await this.sequelize.transaction(async (t) => {
            const period = await this.periodFlow.ensurePeriod(year, month, t);
            this.periodFlow.assertWritable(period);
            let row: FundContributionModel;
            if (id) {
                row = await this.contributionModel.findOne({
                    where: { _id: id, memberId: member._id },
                    transaction: t,
                });
                if (!row) throw ApiError.NotFound("error-record-not-found");
                if (
                    row.status !== FundContributionStatus.PENDING &&
                    row.status !== FundContributionStatus.NOT_DONE
                ) {
                    throw ApiError.Conflict("error-fund-contribution-reviewed");
                }
                await row.update(
                    {
                        periodId: period._id,
                        contributionDate: dto.contributionDate,
                        amount: dto.amount,
                        note: dto.note?.trim() || null,
                        submittedAt: this.timeService.now(),
                        status: FundContributionStatus.PENDING,
                        reviewedBy: null,
                        reviewedAt: null,
                    },
                    { transaction: t },
                );
            } else {
                row = await this.contributionModel.create(
                    {
                        memberId: member._id,
                        periodId: period._id,
                        contributionDate: dto.contributionDate,
                        amount: dto.amount,
                        note: dto.note?.trim() || null,
                        submittedAt: this.timeService.now(),
                    },
                    { transaction: t },
                );
            }
            await this.attachments.replace(
                AttachmentOwnerType.FUND_CONTRIBUTION,
                row._id,
                dto.fileIds,
                user,
                t,
            );
            return row._id;
        });
        const [view] = await this.views([
            await this.contributionModel.findByPk(contributionId, {
                raw: true,
            }),
        ]);
        return view;
    }

    async remove(user: User, id: string) {
        const member = await this.memberOf(user);
        const row = await this.contributionModel.findOne({
            where: { _id: id, memberId: member._id },
            raw: true,
        });
        if (!row) throw ApiError.NotFound("error-record-not-found");
        if (row.status === FundContributionStatus.DONE)
            throw ApiError.Conflict("error-fund-contribution-reviewed");
        await this.sequelize.transaction(async (t) => {
            await this.attachments.removeAll(
                AttachmentOwnerType.FUND_CONTRIBUTION,
                row._id,
                t,
            );
            await this.contributionModel.destroy({
                where: { _id: row._id },
                transaction: t,
            });
        });
        return { deleted: true };
    }

    /** Tiến độ tháng của tôi so với mức tối thiểu */
    async getMine(user: User, code?: string) {
        const member = await this.memberOf(user);
        const now = vnParts(this.timeService.now());
        const period = code
            ? await this.periodFlow.getByCode(code)
            : await this.periodFlow.ensurePeriod(now.year, now.month);
        const rows = await this.contributionModel.findAll({
            where: { memberId: member._id, periodId: period._id },
            order: [
                ["contributionDate", "DESC"],
                ["submittedAt", "DESC"],
            ],
            raw: true,
        });
        const target = await this.monthlyTarget();
        const approved = rows
            .filter((row) => row.status === FundContributionStatus.DONE)
            .reduce((sum, row) => sum + Number(row.amount), 0);
        const pending = rows
            .filter((row) => row.status === FundContributionStatus.PENDING)
            .reduce((sum, row) => sum + Number(row.amount), 0);
        return {
            period: { ...period, isLocked: this.periodFlow.isLocked(period) },
            target,
            approvedAmount: approved,
            pendingAmount: pending,
            reached: approved >= target.minApprovedAmount,
            isEligible: member.memberType === MemberType.MENTEE,
            /** Mentor nộp minh chứng theo tuần; Leader nhóm duyệt */
            weeks: weeksOfPeriod(period).map((week) => {
                const items = rows.filter(
                    (row) => weekOfDate(row.contributionDate) === week.weekKey,
                );
                return {
                    ...week,
                    status: weekStatus(items),
                    amount: items.reduce(
                        (sum, row) => sum + Number(row.amount),
                        0,
                    ),
                };
            }),
            groupId: await this.groupAccess.groupOfMember(member._id),
            contributions: await this.views(rows),
        };
    }

    // ------------------------------------------------------------------
    // Theo nhóm: Leader / Phó nhóm duyệt minh chứng của nhóm mình
    // ------------------------------------------------------------------

    /** Admin hoặc người có quyền FUND: xem/duyệt toàn bộ */
    private async isFundAdmin(user: User) {
        if (user.systemRole === SystemRole.ADMIN) return true;
        return Boolean(
            await this.permissionModel.findOne({
                where: { userId: user._id, scope: AdminScope.FUND },
                raw: true,
            }),
        );
    }

    /** Báo cáo tuần theo nhóm: mỗi thành viên x mỗi tuần trong tháng */
    async groupReport(
        user: User,
        query: { period?: string; groupId?: string },
    ) {
        const now = vnParts(this.timeService.now());
        const period = query.period
            ? await this.periodFlow.getByCode(query.period)
            : await this.periodFlow.ensurePeriod(now.year, now.month);
        const isAdmin = await this.isFundAdmin(user);
        let groups = await this.groupAccess.groups();
        let canReviewGroupIds = new Set(groups.map((group) => group._id));
        if (!isAdmin) {
            const member = await this.groupAccess.memberOfUser(user);
            const leading = member
                ? await this.groupAccess.leadershipOf(member._id)
                : [];
            if (!leading.length) throw ApiError.Forbidden("error-forbidden");
            groups = groups.filter((group) =>
                leading.some((item) => item._id === group._id),
            );
            canReviewGroupIds = new Set(
                leading
                    .filter((item) => item.canReview)
                    .map((item) => item._id),
            );
        }
        if (query.groupId)
            groups = groups.filter((group) => group._id === query.groupId);
        const weeks = weeksOfPeriod(period);
        const memberships = await this.groupAccess.currentMemberships(
            groups.map((group) => group._id),
        );
        const leaders = await this.groupAccess.leadersOf(
            groups.map((group) => group._id),
        );
        const memberIds = memberships.map((row) => row.memberId);
        const members = new Map(
            (
                await this.memberModel.findAll({
                    where: { _id: memberIds },
                    raw: true,
                })
            ).map((member) => [member._id, member]),
        );
        const rows = memberIds.length
            ? await this.contributionModel.findAll({
                  where: { periodId: period._id, memberId: memberIds },
                  order: [
                      ["contributionDate", "ASC"],
                      ["submittedAt", "ASC"],
                  ],
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
                  }
                : null;
        };
        return {
            period: { ...period, isLocked: this.periodFlow.isLocked(period) },
            weeks,
            isAdmin,
            groups: groups.map((group) => {
                const ids = memberships
                    .filter((row) => row.groupId === group._id)
                    .map((row) => row.memberId);
                const roles = leaders.get(group._id);
                const memberRows = ids
                    .map((id) => {
                        const own = rows.filter((row) => row.memberId === id);
                        return {
                            member: brief(id),
                            total: own
                                .filter(
                                    (row) =>
                                        row.status ===
                                        FundContributionStatus.DONE,
                                )
                                .reduce(
                                    (sum, row) => sum + Number(row.amount),
                                    0,
                                ),
                            weeks: Object.fromEntries(
                                weeks.map((week) => {
                                    const items = own.filter(
                                        (row) =>
                                            weekOfDate(row.contributionDate) ===
                                            week.weekKey,
                                    );
                                    return [
                                        week.weekKey,
                                        {
                                            status: weekStatus(items),
                                            amount: items.reduce(
                                                (sum, row) =>
                                                    sum + Number(row.amount),
                                                0,
                                            ),
                                            ids: items.map((row) => row._id),
                                        },
                                    ];
                                }),
                            ),
                        };
                    })
                    .filter((row) => row.member)
                    // Mentor (người nộp quỹ theo tuần) lên trước
                    .sort((a, b) =>
                        a.member.memberType === b.member.memberType
                            ? a.member.memberCode.localeCompare(
                                  b.member.memberCode,
                              )
                            : a.member.memberType === MemberType.MENTOR
                              ? -1
                              : 1,
                    );
                return {
                    _id: group._id,
                    code: group.code,
                    name: group.name,
                    leader: brief(roles?.leaderId),
                    deputy: brief(roles?.deputyId),
                    canReview: canReviewGroupIds.has(group._id),
                    pending: rows.filter(
                        (row) =>
                            ids.includes(row.memberId) &&
                            row.status === FundContributionStatus.PENDING,
                    ).length,
                    members: memberRows,
                };
            }),
            contributions: await this.views(rows),
        };
    }

    /** Kiểm tra người duyệt được duyệt các minh chứng này (Leader: chỉ nhóm mình, không duyệt của chính mình) */
    async assertCanReview(user: User, memberIds: string[]) {
        if (await this.isFundAdmin(user)) return;
        const scope = await this.groupAccess.reviewerScope(user, {
            requireReview: true,
        });
        for (const memberId of memberIds) {
            if (!scope.memberIds.has(memberId) || memberId === scope.memberId)
                throw ApiError.Forbidden("error-forbidden");
        }
    }

    // ------------------------------------------------------------------
    // Ban HLC Fund (admin / quyền FUND)
    // ------------------------------------------------------------------

    async list(query: ContributionQuery) {
        const where: WhereOptions<FundContribution> = {};
        if (query.period)
            where.periodId = (
                await this.periodFlow.getByCode(query.period)
            )._id;
        if (query.date) where.contributionDate = query.date;
        if (query.status) where.status = query.status;
        if (query.memberId) where.memberId = query.memberId;
        const rows = await this.contributionModel.findAll({
            where,
            order: [
                ["contributionDate", "DESC"],
                ["submittedAt", "ASC"],
            ],
            limit: 1000,
            raw: true,
        });
        return this.views(rows);
    }

    async review(
        ids: string[],
        status: "DONE" | "NOT_DONE",
        user: User,
        note?: string,
    ) {
        const rows = await this.contributionModel.findAll({
            where: { _id: ids },
            raw: true,
        });
        if (rows.length !== new Set(ids).size)
            throw ApiError.NotFound("error-record-not-found");
        await this.assertCanReview(
            user,
            rows.map((row) => row.memberId),
        );
        for (const periodId of new Set(rows.map((row) => row.periodId))) {
            this.periodFlow.assertWritable(
                await this.periodFlow.getById(periodId),
            );
        }
        const [affected] = await this.contributionModel.update(
            {
                status,
                reviewedBy: user._id,
                reviewedAt: this.timeService.now(),
                reviewNote: note?.trim() || null,
            },
            { where: { _id: ids } },
        );
        return {
            updated: affected,
            rows: await this.views(
                await this.contributionModel.findAll({
                    where: { _id: ids },
                    raw: true,
                }),
            ),
        };
    }

    /** Thống kê tháng: tổng tiền, số người đạt mức, ai chưa đóng */
    async stats(code: string) {
        const period = await this.periodFlow.getByCode(code);
        const target = await this.monthlyTarget();
        const rows = await this.contributionModel.findAll({
            where: { periodId: period._id },
            raw: true,
        });
        const members = await this.memberModel.findAll({
            where: {
                status: { [Op.ne]: MemberStatus.INACTIVE },
                memberType: MemberType.MENTEE,
            },
            order: [["memberCode", "ASC"]],
            raw: true,
        });
        const byMember = new Map<
            string,
            {
                approved: number;
                pending: number;
                rejected: number;
                count: number;
            }
        >();
        for (const row of rows) {
            const bucket = byMember.get(row.memberId) ?? {
                approved: 0,
                pending: 0,
                rejected: 0,
                count: 0,
            };
            const amount = Number(row.amount);
            if (row.status === FundContributionStatus.DONE)
                bucket.approved += amount;
            else if (row.status === FundContributionStatus.PENDING)
                bucket.pending += amount;
            else bucket.rejected += amount;
            bucket.count += 1;
            byMember.set(row.memberId, bucket);
        }
        const memberRows = members.map((member: Member) => {
            const bucket = byMember.get(member._id) ?? {
                approved: 0,
                pending: 0,
                rejected: 0,
                count: 0,
            };
            return {
                member: {
                    _id: member._id,
                    memberCode: member.memberCode,
                    fullName: member.fullName,
                },
                ...bucket,
                reached: bucket.approved >= target.minApprovedAmount,
            };
        });
        const byDate = new Map<
            string,
            {
                date: string;
                total: number;
                pending: number;
                done: number;
                notDone: number;
                amount: number;
            }
        >();
        for (const row of rows) {
            const item = byDate.get(row.contributionDate) ?? {
                date: row.contributionDate,
                total: 0,
                pending: 0,
                done: 0,
                notDone: 0,
                amount: 0,
            };
            item.total += 1;
            if (row.status === FundContributionStatus.DONE) {
                item.done += 1;
                item.amount += Number(row.amount);
            } else if (row.status === FundContributionStatus.PENDING)
                item.pending += 1;
            else item.notDone += 1;
            byDate.set(row.contributionDate, item);
        }
        return {
            period: { ...period, isLocked: this.periodFlow.isLocked(period) },
            target,
            totals: {
                contributions: rows.length,
                pending: rows.filter(
                    (row) => row.status === FundContributionStatus.PENDING,
                ).length,
                approvedAmount: rows
                    .filter((row) => row.status === FundContributionStatus.DONE)
                    .reduce((sum, row) => sum + Number(row.amount), 0),
                mentees: memberRows.length,
                reached: memberRows.filter((row) => row.reached).length,
                notContributed: memberRows.filter((row) => row.count === 0)
                    .length,
            },
            byDate: [...byDate.values()].sort((a, b) =>
                b.date.localeCompare(a.date),
            ),
            members: memberRows,
        };
    }
}
