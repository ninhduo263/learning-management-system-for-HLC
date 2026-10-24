import { PeriodModel } from "@module/period/models/period.model";
import { AllowanceSummaryModel } from "@module/point/models/allowance-summary.model";
import { ActivityLogService } from "@module/activity-log/activity-log.service";
import { isValidDateKey, vnDateKey, vnParts } from "@common/utils/vn-date.util";
import { ApiError } from "@config/exception/api-error";
import { AttachmentFlowService } from "@module/attachment/attachment-flow.service";
import { AttachmentOwnerType } from "@module/attachment/common/constant";
import { MemberStatus, MemberType } from "@module/member/common/constant";
import { Member } from "@module/member/entities/member.entity";
import { MemberModel } from "@module/member/models/member.model";
import {
    GroupKind,
    RolePermission,
} from "@module/organization/common/constant";
import { GroupAccessService } from "@module/organization/flow/group-access.service";
import { Period } from "@module/period/entities/period.entity";
import { PeriodFlowService } from "@module/period/flow/period-flow.service";
import { AdminScope } from "@module/permission/common/constant";
import { AdminPermissionModel } from "@module/permission/models/admin-permission.model";
import { PointSourceType } from "@module/point/common/constant";
import { PointRuleModel } from "@module/point/models/point-rule.model";
import { TimeService } from "@module/time/time.service";
import { SystemRole } from "@module/user/common/constant";
import { User } from "@module/user/entities/user.entity";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Op, WhereOptions } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import { FundContributionStatus, FundCycleType } from "../common/constant";
import { FundContribution } from "../entities/fund-contribution.entity";
import { FundContributionModel } from "../models/fund-contribution.model";
import { FundContributorModel } from "../models/fund-contributor.model";
import { FundExpenseModel } from "../models/fund-expense.model";
import { ContributionDto } from "./dto/contribution.dto";
import { rowsOfWeek, weekStatus, weeksOfPeriod } from "./fund-weeks.util";

export {
    coveredWeeks,
    rowsOfWeek,
    weekOfDate,
    weekStatus,
    weeksOfPeriod,
    weeksOwnedByMonth,
} from "./fund-weeks.util";
export type { WeekStatus } from "./fund-weeks.util";

export interface ContributionQuery {
    period?: string;
    date?: string;
    status?: FundContributionStatus;
    memberId?: string;
    contributorId?: string;
}

/** Loại người đóng trong sổ quỹ */
export type PayerKind = "MTO" | "MTE" | "EXTERNAL";

export interface ProxyContributionInput extends ContributionDto {
    memberId?: string;
    contributorId?: string;
}

const sum = (rows: { amount: number | string }[]) =>
    rows.reduce((total, row) => total + Number(row.amount), 0);

@Injectable()
export class FundFlowService {
    constructor(
        private readonly sequelize: Sequelize,
        private readonly timeService: TimeService,
        private readonly periodFlow: PeriodFlowService,
        @InjectModel(PeriodModel)
        private readonly periodModel: typeof PeriodModel,
        @InjectModel(AllowanceSummaryModel)
        private readonly summaryModel: typeof AllowanceSummaryModel,
        private readonly attachments: AttachmentFlowService,
        private readonly groupAccess: GroupAccessService,
        private readonly activityLog: ActivityLogService,
        @InjectModel(AdminPermissionModel)
        private readonly permissionModel: typeof AdminPermissionModel,
        @InjectModel(FundContributionModel)
        private readonly contributionModel: typeof FundContributionModel,
        @InjectModel(FundContributorModel)
        private readonly contributorModel: typeof FundContributorModel,
        @InjectModel(FundExpenseModel)
        private readonly expenseModel: typeof FundExpenseModel,
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
        const memberIds = [
            ...new Set(rows.map((row) => row.memberId).filter(Boolean)),
        ];
        const contributorIds = [
            ...new Set(rows.map((row) => row.contributorId).filter(Boolean)),
        ];
        const members = new Map(
            (memberIds.length
                ? await this.memberModel.findAll({
                      where: { _id: memberIds },
                      raw: true,
                  })
                : []
            ).map((member) => [member._id, member]),
        );
        const contributors = new Map(
            (contributorIds.length
                ? await this.contributorModel.findAll({
                      where: { _id: contributorIds },
                      raw: true,
                  })
                : []
            ).map((item) => [item._id, item]),
        );
        const submitterIds = [
            ...new Set(
                rows
                    .filter((row) => row.isProxy && row.submittedBy)
                    .map((row) => row.submittedBy),
            ),
        ];
        const submitters = new Map(
            (submitterIds.length
                ? await this.memberModel.findAll({
                      where: { userId: submitterIds },
                      raw: true,
                  })
                : []
            ).map((member) => [member.userId, member.fullName]),
        );
        return rows.map((row) => {
            const member = row.memberId ? members.get(row.memberId) : null;
            const contributor = row.contributorId
                ? contributors.get(row.contributorId)
                : null;
            return {
                ...row,
                amount: Number(row.amount),
                files: files.get(row._id) ?? [],
                payerKind: (contributor
                    ? "EXTERNAL"
                    : member?.memberType === MemberType.MENTOR
                      ? "MTO"
                      : "MTE") as PayerKind,
                member: member
                    ? {
                          _id: member._id,
                          memberCode: member.memberCode,
                          fullName: member.fullName,
                          memberType: member.memberType,
                      }
                    : contributor
                      ? {
                            _id: contributor._id,
                            memberCode: "",
                            fullName: contributor.fullName,
                            memberType: "EXTERNAL",
                            organization: contributor.organization ?? null,
                        }
                      : null,
                /** Người nộp hộ (Leader / admin) */
                proxyByName: row.isProxy
                    ? (submitters.get(row.submittedBy) ?? "Admin")
                    : null,
            };
        });
    }

    private validateInput(dto: ContributionDto) {
        const today = vnDateKey(this.timeService.now());
        if (
            !isValidDateKey(dto.contributionDate) ||
            dto.contributionDate > today
        )
            throw ApiError.BadRequest("error-fund-date-invalid");
        if (
            dto.coverUntil &&
            (!isValidDateKey(dto.coverUntil) ||
                dto.coverUntil < dto.contributionDate)
        ) {
            throw ApiError.BadRequest("error-fund-cover-until-invalid");
        }
        const [year, month] = dto.contributionDate.split("-").map(Number);
        return { year, month };
    }

    private payload(dto: ContributionDto) {
        return {
            contributionDate: dto.contributionDate,
            amount: dto.amount,
            note: dto.note?.trim() || null,
            cycleType: dto.cycleType ?? FundCycleType.ONCE,
            coverUntil: dto.coverUntil || null,
        };
    }

    // ------------------------------------------------------------------
    // Thành viên tự nộp
    // ------------------------------------------------------------------

    async submit(user: User, dto: ContributionDto, id?: string) {
        const member = await this.memberOf(user);
        const { year, month } = this.validateInput(dto);
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
                if (row.status === FundContributionStatus.DONE)
                    throw ApiError.Conflict("error-fund-contribution-reviewed");
                await row.update(
                    {
                        ...this.payload(dto),
                        periodId: period._id,
                        submittedAt: this.timeService.now(),
                        submittedBy: user._id,
                        isProxy: false,
                        status: FundContributionStatus.PENDING,
                        reviewedBy: null,
                        reviewedAt: null,
                    },
                    { transaction: t },
                );
            } else {
                row = await this.contributionModel.create(
                    {
                        ...this.payload(dto),
                        memberId: member._id,
                        periodId: period._id,
                        submittedAt: this.timeService.now(),
                        submittedBy: user._id,
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

    /** Khoản đóng có liên quan tới kỳ: đóng trong tháng, hoặc đóng trước và còn bao phủ tới tháng này */
    private periodWhere(period: Period) {
        return {
            [Op.or]: [
                { periodId: period._id },
                {
                    coverUntil: { [Op.gte]: period.startDate },
                    contributionDate: { [Op.lte]: period.endDate },
                },
            ],
        };
    }

    async getMine(user: User, code?: string) {
        const member = await this.memberOf(user);
        const now = vnParts(this.timeService.now());
        const period = code
            ? await this.periodFlow.getByCode(code)
            : await this.periodFlow.ensurePeriod(now.year, now.month);
        const rows = await this.contributionModel.findAll({
            where: { memberId: member._id, ...this.periodWhere(period) },
            order: [
                ["contributionDate", "DESC"],
                ["submittedAt", "DESC"],
            ],
            raw: true,
        });
        const inMonth = rows.filter((row) => row.periodId === period._id);
        const target = await this.monthlyTarget();
        const approved = sum(
            inMonth.filter((row) => row.status === FundContributionStatus.DONE),
        );
        return {
            period: { ...period, isLocked: this.periodFlow.isLocked(period) },
            target,
            approvedAmount: approved,
            pendingAmount: sum(
                inMonth.filter(
                    (row) => row.status === FundContributionStatus.PENDING,
                ),
            ),
            reached: approved >= target.minApprovedAmount,
            isEligible: member.memberType === MemberType.MENTEE,
            weeks: weeksOfPeriod(period).map((week) => {
                const items = rowsOfWeek(rows, week.weekKey);
                return {
                    ...week,
                    status: weekStatus(items),
                    amount: sum(
                        items.filter(
                            (row) =>
                                row.contributionDate >= week.from &&
                                row.contributionDate <= week.to,
                        ),
                    ),
                };
            }),
            groupId: await this.groupAccess.groupOfMember(
                member._id,
                member.memberType === MemberType.MENTOR
                    ? GroupKind.FUND
                    : GroupKind.MENTEE,
            ),
            contributions: await this.views(rows),
        };
    }

    // ------------------------------------------------------------------
    // Quyền: Admin HLC Fund / Leader nhóm
    // ------------------------------------------------------------------

    /** Admin toàn cục hoặc phạm vi FUND (cấp trực tiếp / Trưởng ban HLC Fund): xem/duyệt/nộp hộ toàn bộ */
    async isFundAdmin(user: User) {
        if (user.systemRole === SystemRole.ADMIN) return true;
        return (await this.groupAccess.capabilities(user)).scopes.has(
            AdminScope.FUND,
        );
    }

    /** Nhóm người dùng quản lý: { groupIds xem được, groupIds được duyệt/nộp hộ }. null = toàn quyền */
    private async managedGroups(user: User) {
        if (await this.isFundAdmin(user)) return null;
        const member = await this.groupAccess.memberOfUser(user);
        const leading = member
            ? await this.groupAccess.leadershipOf(member._id)
            : [];
        if (!leading.length) throw ApiError.Forbidden("error-forbidden");
        return {
            selfId: member._id,
            leading,
            view: new Set(leading.map((item) => item._id)),
            review: new Set(
                leading
                    .filter((item) =>
                        item.permissions.includes(RolePermission.REVIEW_FUND),
                    )
                    .map((item) => item._id),
            ),
            proxy: new Set(
                leading
                    .filter((item) =>
                        item.permissions.includes(RolePermission.PROXY_FUND),
                    )
                    .map((item) => item._id),
            ),
        };
    }

    /**
     * Leader/Phó: chỉ thành viên (hoặc thầy cô) của nhóm mình. Không ai tự duyệt khoản của chính mình
     * (kể cả Admin là thành viên). Trả người ủy quyền nếu thao tác dùng quyền được ủy quyền.
     */
    async assertCanReview(
        user: User,
        rows: Pick<FundContribution, "memberId" | "contributorId">[],
        mode: "review" | "proxy" = "review",
    ): Promise<{ behalf: { memberId: string; name: string } | null }> {
        const self = await this.groupAccess.memberOfUser(user);
        if (
            mode === "review" &&
            self &&
            rows.some((row) => row.memberId === self._id)
        )
            throw ApiError.Forbidden("error-self-review");
        const managed = await this.managedGroups(user).catch(() => {
            throw ApiError.Forbidden("error-forbidden");
        });
        if (!managed) return { behalf: null };
        const allowedGroups = [
            ...(mode === "proxy" ? managed.proxy : managed.review),
        ];
        const memberships =
            await this.groupAccess.currentMemberships(allowedGroups);
        const groupOf = new Map(
            memberships.map((row) => [row.memberId, row.groupId]),
        );
        const contributors = new Map(
            (
                await this.contributorModel.findAll({
                    where: { groupId: allowedGroups },
                    attributes: ["_id", "groupId"],
                    raw: true,
                })
            ).map((item) => [item._id, item.groupId]),
        );
        const permission =
            mode === "proxy"
                ? RolePermission.PROXY_FUND
                : RolePermission.REVIEW_FUND;
        let behalf: { memberId: string; name: string } | null = null;
        for (const row of rows) {
            const groupId = row.contributorId
                ? contributors.get(row.contributorId)
                : row.memberId !== managed.selfId
                  ? groupOf.get(row.memberId)
                  : undefined;
            if (!groupId) throw ApiError.Forbidden("error-forbidden");
            behalf ??=
                managed.leading.find((item) => item._id === groupId)
                    ?.delegatedFrom?.[permission] ?? null;
        }
        return { behalf };
    }

    // ------------------------------------------------------------------
    // Báo cáo theo nhóm, theo tuần
    // ------------------------------------------------------------------

    async groupReport(
        user: User,
        query: { period?: string; groupId?: string; kind?: GroupKind },
    ) {
        const now = vnParts(this.timeService.now());
        const period = query.period
            ? await this.periodFlow.getByCode(query.period)
            : await this.periodFlow.ensurePeriod(now.year, now.month);
        const managed = await this.managedGroups(user);
        let groups = await this.groupAccess.groups(false, query.kind);
        if (managed)
            groups = groups.filter((group) => managed.view.has(group._id));
        if (query.groupId)
            groups = groups.filter((group) => group._id === query.groupId);
        const groupIds = groups.map((group) => group._id);
        const weeks = weeksOfPeriod(period);
        const memberships = await this.groupAccess.currentMemberships(groupIds);
        const leaders = await this.groupAccess.leadersOf(groupIds);
        const contributors = groupIds.length
            ? await this.contributorModel.findAll({
                  where: { groupId: groupIds, isActive: true },
                  order: [["fullName", "ASC"]],
                  raw: true,
              })
            : [];
        const memberIds = memberships.map((row) => row.memberId);
        const members = new Map(
            (memberIds.length
                ? await this.memberModel.findAll({
                      where: { _id: memberIds },
                      raw: true,
                  })
                : []
            ).map((member) => [member._id, member]),
        );
        const leaderIds = [...leaders.values()]
            .flatMap((item) => [item.leaderId, item.deputyId])
            .filter(Boolean);
        const leaderMembers = new Map(
            (leaderIds.length
                ? await this.memberModel.findAll({
                      where: { _id: leaderIds },
                      raw: true,
                  })
                : []
            ).map((member) => [member._id, member]),
        );
        const payerWhere = [
            ...(memberIds.length ? [{ memberId: memberIds }] : []),
            ...(contributors.length
                ? [{ contributorId: contributors.map((item) => item._id) }]
                : []),
        ];
        const rows = payerWhere.length
            ? await this.contributionModel.findAll({
                  where: {
                      [Op.and]: [
                          this.periodWhere(period),
                          { [Op.or]: payerWhere },
                      ],
                  },
                  order: [
                      ["contributionDate", "ASC"],
                      ["submittedAt", "ASC"],
                  ],
                  raw: true,
              })
            : [];
        const brief = (member?: Member) =>
            member && {
                _id: member._id,
                memberCode: member.memberCode,
                fullName: member.fullName,
                memberType: member.memberType,
            };
        const payerRow = (
            payer: {
                _id: string;
                memberCode: string;
                fullName: string;
                memberType: string;
                organization?: string | null;
            },
            own: FundContribution[],
        ) => ({
            member: payer,
            total: sum(
                own.filter(
                    (row) =>
                        row.status === FundContributionStatus.DONE &&
                        row.periodId === period._id,
                ),
            ),
            /** Đã đóng (được duyệt) tới ngày */
            paidUntil: own
                .filter((row) => row.status === FundContributionStatus.DONE)
                .reduce<string | null>((max, row) => {
                    const until = row.coverUntil ?? row.contributionDate;
                    return !max || until > max ? until : max;
                }, null),
            weeks: Object.fromEntries(
                weeks.map((week) => {
                    const items = rowsOfWeek(own, week.weekKey);
                    return [
                        week.weekKey,
                        {
                            status: weekStatus(items),
                            amount: sum(
                                items.filter(
                                    (row) =>
                                        row.contributionDate >= week.from &&
                                        row.contributionDate <= week.to,
                                ),
                            ),
                            ids: items.map((row) => row._id),
                        },
                    ];
                }),
            ),
        });
        return {
            period: { ...period, isLocked: this.periodFlow.isLocked(period) },
            weeks,
            isAdmin: !managed,
            groups: groups.map((group) => {
                const roles = leaders.get(group._id);
                const ids = memberships
                    .filter((row) => row.groupId === group._id)
                    .map((row) => row.memberId);
                const groupContributors = contributors.filter(
                    (item) => item.groupId === group._id,
                );
                const memberRows = [
                    ...ids
                        .map((id) => members.get(id))
                        .filter(Boolean)
                        .sort((a, b) =>
                            a.memberType === b.memberType
                                ? a.memberCode.localeCompare(b.memberCode)
                                : a.memberType === MemberType.MENTOR
                                  ? -1
                                  : 1,
                        )
                        .map((member) =>
                            payerRow(
                                brief(member),
                                rows.filter(
                                    (row) => row.memberId === member._id,
                                ),
                            ),
                        ),
                    ...groupContributors.map((item) =>
                        payerRow(
                            {
                                _id: item._id,
                                memberCode: "",
                                fullName: item.fullName,
                                memberType: "EXTERNAL",
                                organization: item.organization ?? null,
                            },
                            rows.filter(
                                (row) => row.contributorId === item._id,
                            ),
                        ),
                    ),
                ];
                const payerIds = new Set([
                    ...ids,
                    ...groupContributors.map((item) => item._id),
                ]);
                return {
                    _id: group._id,
                    code: group.code,
                    name: group.name,
                    groupKind: group.groupKind ?? GroupKind.MENTEE,
                    leader: brief(leaderMembers.get(roles?.leaderId)) ?? null,
                    deputy: brief(leaderMembers.get(roles?.deputyId)) ?? null,
                    canReview: !managed || managed.review.has(group._id),
                    canProxy: !managed || managed.proxy.has(group._id),
                    pending: rows.filter(
                        (row) =>
                            payerIds.has(row.memberId ?? row.contributorId) &&
                            row.status === FundContributionStatus.PENDING,
                    ).length,
                    members: memberRows,
                };
            }),
            contributions: await this.views(rows),
        };
    }

    // ------------------------------------------------------------------
    // Nộp hộ (Leader nhóm / Admin HLC Fund)
    // ------------------------------------------------------------------

    async proxySubmit(user: User, input: ProxyContributionInput) {
        if (!input.memberId === !input.contributorId)
            throw ApiError.BadRequest("error-fund-payer-required");
        const { year, month } = this.validateInput(input);
        if (input.contributorId) {
            const contributor = await this.contributorModel.findByPk(
                input.contributorId,
                { raw: true },
            );
            if (!contributor) throw ApiError.NotFound("error-record-not-found");
            // Thầy cô: bắt buộc khai báo chu kỳ và thời gian đóng
            if (!input.cycleType)
                throw ApiError.BadRequest("error-fund-cycle-required");
        } else if (
            !(await this.memberModel.findByPk(input.memberId, { raw: true }))
        ) {
            throw ApiError.NotFound("error-record-not-found");
        }
        const { behalf } = await this.assertCanReview(
            user,
            [{ memberId: input.memberId, contributorId: input.contributorId }],
            "proxy",
        );
        await this.attachments.loadFiles(input.fileIds, { requireImage: true });
        const id = await this.sequelize.transaction(async (t) => {
            const period = await this.periodFlow.ensurePeriod(year, month, t);
            this.periodFlow.assertWritable(period);
            const row = await this.contributionModel.create(
                {
                    ...this.payload(input),
                    memberId: input.memberId ?? null,
                    contributorId: input.contributorId ?? null,
                    periodId: period._id,
                    submittedAt: this.timeService.now(),
                    submittedBy: user._id,
                    isProxy: true,
                },
                { transaction: t },
            );
            await this.attachments.replace(
                AttachmentOwnerType.FUND_CONTRIBUTION,
                row._id,
                input.fileIds,
                user,
                t,
            );
            return row._id;
        });
        const [view] = await this.views([
            await this.contributionModel.findByPk(id, { raw: true }),
        ]);
        if (behalf)
            await this.activityLog.log(user, {
                module: "FUND",
                action: "FUND_PROXY_DELEGATED",
                targetId: id,
                summary: `Nộp hộ minh chứng quỹ (làm thay cho ${behalf.name})`,
                onBehalfOf: behalf,
            });
        return view;
    }

    // ------------------------------------------------------------------
    // Thầy cô ngoài danh sách MTO
    // ------------------------------------------------------------------

    async listContributors(user: User, groupId?: string) {
        const managed = await this.managedGroups(user);
        const where: WhereOptions = {};
        if (managed) where.groupId = [...managed.view];
        if (groupId)
            where.groupId =
                managed && !managed.view.has(groupId) ? [] : groupId;
        return this.contributorModel.findAll({
            where,
            order: [["fullName", "ASC"]],
            raw: true,
        });
    }

    async saveContributor(
        user: User,
        dto: {
            fullName: string;
            organization?: string;
            contact?: string;
            groupId?: string;
            note?: string;
            isActive?: boolean;
        },
        id?: string,
    ) {
        const managed = await this.managedGroups(user);
        if (dto.groupId) {
            const groups = await this.groupAccess.groups(true, GroupKind.FUND);
            if (!groups.some((group) => group._id === dto.groupId))
                throw ApiError.BadRequest("error-group-not-found");
        }
        // Leader nhóm Fund chỉ thêm/sửa thầy cô trong nhóm mình
        if (
            managed &&
            (!dto.groupId ||
                !(
                    managed.review.has(dto.groupId) ||
                    managed.proxy.has(dto.groupId)
                ))
        )
            throw ApiError.Forbidden("error-forbidden");
        const values = {
            fullName: dto.fullName.trim(),
            organization: dto.organization?.trim() || null,
            contact: dto.contact?.trim() || null,
            groupId: dto.groupId || null,
            note: dto.note?.trim() || null,
            ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        };
        if (id) {
            const row = await this.contributorModel.findByPk(id);
            if (!row) throw ApiError.NotFound("error-record-not-found");
            if (
                managed &&
                !(
                    managed.review.has(row.groupId) ||
                    managed.proxy.has(row.groupId)
                )
            )
                throw ApiError.Forbidden("error-forbidden");
            await row.update(values);
            return row.get({ plain: true });
        }
        return (
            await this.contributorModel.create({
                ...values,
                createdBy: user._id,
            })
        ).get({ plain: true });
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
        if (query.contributorId) where.contributorId = query.contributorId;
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
        const { behalf } = await this.assertCanReview(user, rows);
        if (behalf)
            await this.activityLog.log(user, {
                module: "FUND",
                action: "FUND_REVIEW_DELEGATED",
                targetId: ids[0],
                summary: `${status === "DONE" ? "Duyệt" : "Không duyệt"} ${ids.length} minh chứng quỹ (làm thay cho ${behalf.name})`,
                detail: { ids },
                onBehalfOf: behalf,
            });
        for (const periodId of new Set(rows.map((row) => row.periodId)))
            this.periodFlow.assertWritable(
                await this.periodFlow.getById(periodId),
            );
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

    /** Thống kê tháng của mentee: tổng tiền, số người đạt mức, ai chưa đóng */
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
        const memberRows = members.map((member: Member) => {
            const own = rows.filter((row) => row.memberId === member._id);
            const approved = sum(
                own.filter((row) => row.status === FundContributionStatus.DONE),
            );
            return {
                member: {
                    _id: member._id,
                    memberCode: member.memberCode,
                    fullName: member.fullName,
                },
                approved,
                pending: sum(
                    own.filter(
                        (row) => row.status === FundContributionStatus.PENDING,
                    ),
                ),
                rejected: sum(
                    own.filter(
                        (row) => row.status === FundContributionStatus.NOT_DONE,
                    ),
                ),
                count: own.length,
                reached: approved >= target.minApprovedAmount,
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
                approvedAmount: sum(
                    rows.filter(
                        (row) => row.status === FundContributionStatus.DONE,
                    ),
                ),
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

    // ------------------------------------------------------------------
    // Sổ thu chi chung (MTO + MTE + thầy cô), theo tháng và quý
    // ------------------------------------------------------------------

    /**
     * Sổ thu chi / Dashboard (theo tháng hoặc quý của năm). Thu: minh chứng quỹ đã duyệt theo ngày đóng, tách
     * nguồn nhóm MTE / nhóm HLC Fund của MTO / thầy cô ngoài danh sách. Chi: theo NGÀY CHI THỰC TẾ, tách chi
     * phụ cấp (sinh tự động khi Xác nhận đã chi, gắn mã bảng PC-YYYY-MM) và các khoản chi khác.
     * Lọc: kind (nguồn thu), groupKind (MENTEE = nhóm MTE; FUND = MTO + thầy cô), month, quarter.
     */
    async ledger(query: {
        year?: number;
        quarter?: number;
        month?: number;
        kind?: PayerKind;
        groupKind?: string;
    }) {
        const year = query.year || vnParts(this.timeService.now()).year;
        const months = query.month
            ? [query.month]
            : query.quarter
              ? [0, 1, 2].map((index) => (query.quarter - 1) * 3 + 1 + index)
              : Array.from({ length: 12 }, (_, index) => index + 1);
        const pad = (value: number) => String(value).padStart(2, "0");
        const from = `${year}-${pad(months[0])}-01`;
        const lastMonth = months[months.length - 1];
        const to = `${year}-${pad(lastMonth)}-${pad(new Date(Date.UTC(year, lastMonth, 0)).getUTCDate())}`;
        const income = await this.contributionModel.findAll({
            where: {
                status: FundContributionStatus.DONE,
                contributionDate: { [Op.lte]: to },
            },
            raw: true,
        });
        const expenses = (
            await this.expenseModel.findAll({
                where: { expenseDate: { [Op.lte]: to } },
                order: [["expenseDate", "DESC"]],
                raw: true,
            })
        ).map((row) => ({ ...row, amount: Number(row.amount) }));
        const members = new Map(
            (
                await this.memberModel.findAll({
                    where: {
                        _id: [
                            ...new Set(
                                income
                                    .map((row) => row.memberId)
                                    .filter(Boolean),
                            ),
                        ],
                    },
                    attributes: ["_id", "memberType"],
                    raw: true,
                })
            ).map((member) => [member._id, member.memberType]),
        );
        const kindOf = (row: FundContribution): PayerKind =>
            row.contributorId
                ? "EXTERNAL"
                : members.get(row.memberId) === MemberType.MENTOR
                  ? "MTO"
                  : "MTE";
        const groupKinds: Record<string, PayerKind[]> = {
            MENTEE: ["MTE"],
            FUND: ["MTO", "EXTERNAL"],
        };
        const incomeRows = income.filter(
            (row) =>
                (!query.kind || kindOf(row) === query.kind) &&
                (!query.groupKind ||
                    (groupKinds[query.groupKind] ?? []).includes(kindOf(row))),
        );
        const isAllowance = (row: { source?: string }) =>
            row.source === "ALLOWANCE";
        const inRange = (date: string) => date >= from && date <= to;
        const monthOf = (date: string) => Number(date.slice(5, 7));
        const byKind = (rows: FundContribution[]) => ({
            total: sum(rows),
            MTE: sum(rows.filter((row) => kindOf(row) === "MTE")),
            MTO: sum(rows.filter((row) => kindOf(row) === "MTO")),
            EXTERNAL: sum(rows.filter((row) => kindOf(row) === "EXTERNAL")),
        });
        const byType = (rows: typeof expenses) => ({
            total: sum(rows),
            ALLOWANCE: sum(rows.filter(isAllowance)),
            OTHER: sum(rows.filter((row) => !isAllowance(row))),
        });
        const byMonth = months.map((month) => {
            const monthIncome = incomeRows.filter(
                (row) =>
                    inRange(row.contributionDate) &&
                    monthOf(row.contributionDate) === month,
            );
            const monthExpense = expenses.filter(
                (row) =>
                    inRange(row.expenseDate) &&
                    monthOf(row.expenseDate) === month,
            );
            const expense = byType(monthExpense);
            return {
                month,
                code: `${year}-${pad(month)}`,
                income: byKind(monthIncome),
                expense: expense.total,
                expenseByType: expense,
                net: sum(monthIncome) - expense.total,
            };
        });
        const quarters = [1, 2, 3, 4]
            .filter((item) =>
                months.some((month) => Math.ceil(month / 3) === item),
            )
            .map((item) => {
                const rows = byMonth.filter(
                    (row) => Math.ceil(row.month / 3) === item,
                );
                const incomeTotal = rows.reduce(
                    (total, row) => total + row.income.total,
                    0,
                );
                const expenseTotal = rows.reduce(
                    (total, row) => total + row.expense,
                    0,
                );
                return {
                    quarter: item,
                    income: incomeTotal,
                    expense: expenseTotal,
                    expenseAllowance: rows.reduce(
                        (total, row) => total + row.expenseByType.ALLOWANCE,
                        0,
                    ),
                    net: incomeTotal - expenseTotal,
                };
            });
        const rangeIncome = incomeRows.filter((row) =>
            inRange(row.contributionDate),
        );
        const rangeExpense = expenses.filter((row) => inRange(row.expenseDate));
        const totalIncome = sum(rangeIncome);
        const expenseSplit = byType(rangeExpense);
        // Đối chiếu theo kỳ phụ cấp: bảng tổng hợp (điểm x đơn giá) với khoản chi đã ghi sổ
        const periods = await this.periodModel.findAll({
            where: { year, month: months },
            order: [["code", "ASC"]],
            raw: true,
        });
        const allowanceExpenses = expenses.filter(isAllowance);
        const summaries = periods.length
            ? await this.summaryModel.findAll({
                  where: { periodId: periods.map((item) => item._id) },
                  attributes: ["periodId", "amount"],
                  raw: true,
              })
            : [];
        const allowancePeriods = periods.map((period) => {
            const expense = allowanceExpenses.find(
                (row) => row.periodId === period._id,
            );
            const summaryAmount = Math.round(
                summaries
                    .filter((row) => row.periodId === period._id)
                    .reduce((total, row) => total + Number(row.amount ?? 0), 0),
            );
            const detail = (expense?.detail ?? {}) as {
                carryOverTotal?: number;
            };
            return {
                periodCode: period.code,
                sheetCode: `PC-${period.code}`,
                status: period.status,
                summaryAmount,
                paidDate: period.paidDate ?? null,
                recordedAmount: expense ? expense.amount : null,
                expenseDate: expense?.expenseDate ?? null,
                carryOverTotal: detail.carryOverTotal ?? 0,
                /** Bảng đã sửa sau khi chi (mở khóa thử nghiệm): xử lý bằng bù chênh lệch tháng sau */
                difference: expense ? summaryAmount - expense.amount : null,
            };
        });
        return {
            year,
            quarter: query.quarter ?? null,
            month: query.month ?? null,
            kind: query.kind ?? null,
            groupKind: query.groupKind ?? null,
            from,
            to,
            totals: {
                income: totalIncome,
                incomeByKind: byKind(rangeIncome),
                expense: expenseSplit.total,
                expenseByType: expenseSplit,
                net: totalIncome - expenseSplit.total,
                /** Tồn quỹ cuối kỳ (mọi khoản thu đã duyệt - mọi khoản chi đến ngày cuối kỳ) */
                balance: sum(income) - sum(expenses),
            },
            byMonth,
            byQuarter: quarters,
            allowancePeriods,
            expenses: rangeExpense,
        };
    }

    async saveExpense(
        user: User,
        dto: {
            expenseDate: string;
            amount: number;
            description: string;
            category?: string;
        },
        id?: string,
    ) {
        if (!isValidDateKey(dto.expenseDate))
            throw ApiError.BadRequest("error-fund-date-invalid");
        const values = {
            expenseDate: dto.expenseDate,
            amount: dto.amount,
            description: dto.description.trim(),
            category: dto.category?.trim() || null,
        };
        if (id) {
            const row = await this.expenseModel.findByPk(id);
            if (!row) throw ApiError.NotFound("error-record-not-found");
            if (row.source === "ALLOWANCE")
                throw ApiError.BadRequest("error-expense-allowance-managed", {
                    code: row.sheetCode,
                });
            await row.update(values);
            return row.get({ plain: true });
        }
        return (
            await this.expenseModel.create({ ...values, createdBy: user._id })
        ).get({ plain: true });
    }

    async removeExpense(id: string) {
        const row = await this.expenseModel.findByPk(id, { raw: true });
        if (row?.source === "ALLOWANCE")
            throw ApiError.BadRequest("error-expense-allowance-managed", {
                code: row.sheetCode,
            });
        const deleted = await this.expenseModel.destroy({ where: { _id: id } });
        if (!deleted) throw ApiError.NotFound("error-record-not-found");
        return { deleted: true };
    }
}
