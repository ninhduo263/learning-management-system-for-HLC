import { ApiError } from "@config/exception/api-error";
import { MemberStatus, MemberType } from "@module/member/common/constant";
import { MemberModel } from "@module/member/models/member.model";
import { ProvinceModel } from "@module/member/models/province.model";
import { GroupKind } from "@module/organization/common/constant";
import { GroupAccessService } from "@module/organization/flow/group-access.service";
import { GroupFlowService } from "@module/organization/flow/group-flow.service";
import { PeriodModel } from "@module/period/models/period.model";
import { AllowanceSummaryModel } from "@module/point/models/allowance-summary.model";
import { User } from "@module/user/entities/user.entity";
import { ActivityLogService } from "@module/activity-log/activity-log.service";
import { Injectable } from "@nestjs/common";
import { TimeService } from "@module/time/time.service";
import { CatalogService } from "@module/catalog/catalog.service";
import { vnDateKey } from "@common/utils/vn-date.util";
import { InjectModel } from "@nestjs/sequelize";
import { Op } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import { MentoringPairStatus } from "../common/constant";
import { MentorPreferenceItemModel } from "../models/mentor-preference-item.model";
import { MentorPreferenceModel } from "../models/mentor-preference.model";
import { MentoringPairModel } from "../models/mentoring-pair.model";
import { MentoringQuarterModel } from "../models/mentoring-quarter.model";

export const SUGGEST_CRITERIA = [
    "major",
    "occupation",
    "location",
    "hometown",
    "preference",
] as const;
type Criterion = (typeof SUGGEST_CRITERIA)[number];

/**
 * Gợi ý ghép cặp MTE - MTO theo hồ sơ và gợi ý chia nhóm cân bằng. Chấm điểm tương đồng đơn giản, tính tức
 * thời (quy mô ~40 MTE x 30 MTO chỉ vài mili-giây). Hệ thống chỉ gợi ý; Admin quyết định và tự ghép.
 */
@Injectable()
export class MentoringSuggestService {
    constructor(
        private readonly sequelize: Sequelize,
        private readonly groupAccess: GroupAccessService,
        private readonly groupFlow: GroupFlowService,
        private readonly activityLog: ActivityLogService,
        private readonly timeService: TimeService,
        private readonly catalogs: CatalogService,
        @InjectModel(MemberModel)
        private readonly memberModel: typeof MemberModel,
        @InjectModel(ProvinceModel)
        private readonly provinceModel: typeof ProvinceModel,
        @InjectModel(MentoringQuarterModel)
        private readonly quarterModel: typeof MentoringQuarterModel,
        @InjectModel(MentoringPairModel)
        private readonly pairModel: typeof MentoringPairModel,
        @InjectModel(MentorPreferenceModel)
        private readonly preferenceModel: typeof MentorPreferenceModel,
        @InjectModel(MentorPreferenceItemModel)
        private readonly preferenceItemModel: typeof MentorPreferenceItemModel,
        @InjectModel(PeriodModel)
        private readonly periodModel: typeof PeriodModel,
        @InjectModel(AllowanceSummaryModel)
        private readonly summaryModel: typeof AllowanceSummaryModel,
    ) {}

    /**
     * Danh sách MTO phù hợp cho từng MTE của quý: điểm tương đồng + lý do. MTO đã có cặp bị giảm thứ hạng
     * (không chặn) kèm cảnh báo "MTO này đã có X cặp".
     */
    async pairSuggestions(
        quarterCode: string,
        options: { criteria?: string[]; menteeId?: string; limit?: number },
    ) {
        const started = Date.now();
        const quarter = await this.quarterModel.findOne({
            where: { code: quarterCode },
            raw: true,
        });
        if (!quarter) throw ApiError.NotFound("error-record-not-found");
        const criteria = new Set<Criterion>(
            (options.criteria?.length
                ? options.criteria
                : SUGGEST_CRITERIA
            ).filter((item): item is Criterion =>
                (SUGGEST_CRITERIA as readonly string[]).includes(item),
            ),
        );
        const [members, provinces, pairs] = await Promise.all([
            this.memberModel.findAll({
                where: { status: { [Op.ne]: MemberStatus.INACTIVE } },
                order: [["memberCode", "ASC"]],
                raw: true,
            }),
            this.provinceModel.findAll({ raw: true }),
            this.pairModel.findAll({
                where: {
                    quarterId: quarter._id,
                    status: { [Op.ne]: MentoringPairStatus.CANCELLED },
                },
                raw: true,
            }),
        ]);
        const provinceName = new Map(
            provinces.map((item) => [item.code, item.name]),
        );
        const mentors = members.filter(
            (item) => item.memberType === MemberType.MENTOR,
        );
        const mentees = members.filter(
            (item) =>
                item.memberType === MemberType.MENTEE &&
                (!options.menteeId || item._id === options.menteeId),
        );
        const pairCount = new Map<string, number>();
        for (const pair of pairs)
            pairCount.set(
                pair.mentorId,
                (pairCount.get(pair.mentorId) ?? 0) + 1,
            );
        const pairedMentees = new Map<string, string[]>();
        for (const pair of pairs)
            pairedMentees.set(pair.menteeId, [
                ...(pairedMentees.get(pair.menteeId) ?? []),
                pair.mentorId,
            ]);
        // Nguyện vọng MTE chọn MTO trong quý
        const preferences = await this.preferenceModel.findAll({
            where: { quarterId: quarter._id },
            raw: true,
        });
        const items = preferences.length
            ? await this.preferenceItemModel.findAll({
                  where: { preferenceId: preferences.map((item) => item._id) },
                  raw: true,
              })
            : [];
        const wish = new Map<string, number>();
        for (const item of items) {
            const preference = preferences.find(
                (row) => row._id === item.preferenceId,
            );
            if (preference)
                wish.set(
                    `${preference.menteeId}|${item.mentorId}`,
                    item.priority,
                );
        }
        // Nhóm ngành nghề (chọn nhiều): xét mức trùng khớp giữa các nhóm đã chọn
        const careers = new Map(
            (await this.catalogs.list("CAREER", true)).map((row) => [
                row.code,
                row.name,
            ]),
        );
        const careerNames = (codes?: string[] | null) =>
            (codes ?? []).map((code) => careers.get(code) ?? code);
        const overlap = (left?: string[] | null, right?: string[] | null) =>
            (left ?? []).filter((code) => (right ?? []).includes(code));
        const brief = (item: MemberModel) => ({
            _id: item._id,
            memberCode: item.memberCode,
            fullName: item.fullName,
            major: careerNames(item.majorCodes).join(", ") || null,
            occupation: careerNames(item.occupationCodes).join(", ") || null,
            address: item.addressCode
                ? (provinceName.get(item.addressCode) ?? item.addressCode)
                : null,
            hometown: item.hometownCode
                ? (provinceName.get(item.hometownCode) ?? item.hometownCode)
                : null,
        });
        const limit = Math.min(Math.max(options.limit ?? 5, 1), 30);
        const rows = mentees.map((mentee) => {
            const candidates = mentors
                .map((mentor) => {
                    let score = 0;
                    const reasons: string[] = [];
                    // Mức trùng khớp: mỗi nhóm trùng cộng điểm, tối đa 3 nhóm mỗi tiêu chí
                    if (criteria.has("major")) {
                        const same = overlap(
                            mentee.majorCodes,
                            mentor.majorCodes,
                        );
                        if (same.length) {
                            score += 2 + Math.min(same.length, 3);
                            reasons.push(
                                `Cùng ngành học: ${careerNames(same).join(", ")}`,
                            );
                        }
                    }
                    if (criteria.has("occupation")) {
                        const same = overlap(
                            mentee.occupationCodes,
                            mentor.occupationCodes,
                        );
                        const cross = overlap(
                            mentee.majorCodes,
                            mentor.occupationCodes,
                        ).filter((code) => !same.includes(code));
                        if (same.length) {
                            score += 2 + Math.min(same.length, 3);
                            reasons.push(
                                `Cùng ngành nghề: ${careerNames(same).join(", ")}`,
                            );
                        }
                        if (cross.length) {
                            score += 1 + Math.min(cross.length, 2);
                            reasons.push(
                                `Ngành học của MTE trùng ngành nghề của MTO: ${careerNames(cross).join(", ")}`,
                            );
                        }
                    }
                    if (
                        criteria.has("location") &&
                        mentee.addressCode &&
                        mentee.addressCode === mentor.addressCode
                    ) {
                        score += 2;
                        reasons.push(
                            `Cùng khu vực sống (${provinceName.get(mentor.addressCode) ?? mentor.addressCode})`,
                        );
                    }
                    if (
                        criteria.has("hometown") &&
                        mentee.hometownCode &&
                        mentee.hometownCode === mentor.hometownCode
                    ) {
                        score += 1;
                        reasons.push(
                            `Cùng quê (${provinceName.get(mentor.hometownCode) ?? mentor.hometownCode})`,
                        );
                    }
                    const priority = wish.get(`${mentee._id}|${mentor._id}`);
                    if (criteria.has("preference") && priority) {
                        score += Math.max(4 - (priority - 1), 1);
                        reasons.push(`MTE chọn làm nguyện vọng ${priority}`);
                    }
                    const existing = pairCount.get(mentor._id) ?? 0;
                    // Không khuyến khích 1 MTO nhiều cặp: giảm thứ hạng, không chặn
                    const rank = score - existing * 1.5;
                    return {
                        mentor: brief(mentor),
                        score,
                        rankScore: Math.round(rank * 100) / 100,
                        reasons,
                        existingPairs: existing,
                        warning: existing
                            ? `MTO này đã có ${existing} cặp trong quý`
                            : null,
                    };
                })
                .filter((item) => item.score > 0)
                .sort(
                    (a, b) =>
                        b.rankScore - a.rankScore ||
                        a.existingPairs - b.existingPairs ||
                        a.mentor.memberCode.localeCompare(b.mentor.memberCode),
                )
                .slice(0, limit);
            return {
                mentee: brief(mentee),
                pairedMentorIds: pairedMentees.get(mentee._id) ?? [],
                /** Hồ sơ còn thiếu thông tin dùng để gợi ý */
                missingProfile: [
                    !mentee.majorCodes?.length && "ngành học",
                    !mentee.occupationCodes?.length && "ngành nghề",
                    !mentee.addressCode && "địa chỉ",
                ].filter(Boolean),
                candidates,
            };
        });
        return {
            quarter: { _id: quarter._id, code: quarter.code },
            criteria: [...criteria],
            mentors: mentors.length,
            mentees: rows.length,
            elapsedMs: Date.now() - started,
            rows,
        };
    }

    /**
     * Phương án chia thành viên vào các nhóm cân bằng số người và mức hoạt động (điểm phụ cấp 3 tháng gần nhất):
     * xếp theo mức hoạt động rồi chia vòng (rắn bò) để mỗi nhóm có cả người hoạt động nhiều và ít.
     * Người đang giữ vai trò ở nhóm được giữ nguyên nhóm. Admin chỉnh tay rồi mới áp dụng.
     */
    async groupPlan(kind: GroupKind = GroupKind.MENTEE) {
        const groups = (await this.groupAccess.groups(false, kind)).map(
            (item) => ({ _id: item._id, code: item.code, name: item.name }),
        );
        if (!groups.length) return { groups: [], members: [] };
        const memberType =
            kind === GroupKind.FUND ? MemberType.MENTOR : MemberType.MENTEE;
        const members = await this.memberModel.findAll({
            where: {
                memberType,
                status: { [Op.ne]: MemberStatus.INACTIVE },
            },
            order: [["memberCode", "ASC"]],
            raw: true,
        });
        // 3 tháng gần nhất tính đến tháng hiện tại (bỏ kỳ tương lai đã được tạo sẵn)
        const current = vnDateKey(this.timeService.now()).slice(0, 7);
        const periods = await this.periodModel.findAll({
            where: { code: { [Op.lte]: current } },
            order: [["code", "DESC"]],
            limit: 3,
            raw: true,
        });
        const summaries = periods.length
            ? await this.summaryModel.findAll({
                  where: { periodId: periods.map((item) => item._id) },
                  raw: true,
              })
            : [];
        const activity = new Map<string, number>();
        for (const row of summaries)
            activity.set(
                row.memberId,
                (activity.get(row.memberId) ?? 0) +
                    Number(row.totalPoints ?? 0),
            );
        const memberships = await this.groupAccess.currentMemberships(
            groups.map((item) => item._id),
        );
        const currentGroup = new Map(
            memberships.map((row) => [row.memberId, row.groupId]),
        );
        const leaders = await this.groupAccess.leadersOf(
            groups.map((item) => item._id),
        );
        const pinned = new Map<string, string>();
        for (const [groupId, info] of leaders)
            for (const holder of info.holders)
                if (currentGroup.get(holder.memberId) === groupId)
                    pinned.set(holder.memberId, groupId);
        const load = new Map(
            groups.map((item) => [item._id, { count: 0, activity: 0 }]),
        );
        const proposal = new Map<string, string>();
        for (const [memberId, groupId] of pinned) {
            proposal.set(memberId, groupId);
            const value = load.get(groupId);
            value.count += 1;
            value.activity += activity.get(memberId) ?? 0;
        }
        const rest = members
            .filter((item) => !pinned.has(item._id))
            .sort(
                (a, b) =>
                    (activity.get(b._id) ?? 0) - (activity.get(a._id) ?? 0) ||
                    a.memberCode.localeCompare(b.memberCode),
            );
        // Chia theo tầng: mỗi tầng N người (N = số nhóm), tầng chẵn xuôi, tầng lẻ ngược; ưu tiên nhóm ít người
        for (let index = 0; index < rest.length; index += groups.length) {
            const tier = rest.slice(index, index + groups.length);
            const order = [...groups].sort((a, b) => {
                const left = load.get(a._id);
                const right = load.get(b._id);
                return (
                    left.count - right.count || left.activity - right.activity
                );
            });
            tier.forEach((member, position) => {
                const group = order[position % order.length];
                proposal.set(member._id, group._id);
                const value = load.get(group._id);
                value.count += 1;
                value.activity += activity.get(member._id) ?? 0;
            });
        }
        const view = members.map((item) => ({
            member: {
                _id: item._id,
                memberCode: item.memberCode,
                fullName: item.fullName,
            },
            activity: Math.round((activity.get(item._id) ?? 0) * 100) / 100,
            currentGroupId: currentGroup.get(item._id) ?? null,
            proposedGroupId: proposal.get(item._id),
            pinned: pinned.has(item._id),
        }));
        return {
            kind,
            periods: periods.map((item) => item.code),
            groups: groups.map((group) => ({
                ...group,
                count: load.get(group._id).count,
                activity: Math.round(load.get(group._id).activity * 100) / 100,
            })),
            members: view,
        };
    }

    /** Áp dụng phương án Admin đã xác nhận (đã chỉnh tay): chuyển từng người sang nhóm được chọn */
    async applyGroupPlan(
        user: User,
        assignments: { memberId: string; groupId: string }[],
    ) {
        let moved = 0;
        for (const item of assignments) {
            const current = (
                await this.groupAccess.currentMemberships([item.groupId])
            ).some((row) => row.memberId === item.memberId);
            if (current) continue;
            const result = await this.groupFlow.addMembers(
                item.groupId,
                [item.memberId],
                user,
                "Chia nhóm cân bằng",
            );
            moved += result.moved;
        }
        await this.activityLog.log(user, {
            module: "ORGANIZATION",
            action: "GROUP_REBALANCE",
            summary: `Áp dụng phương án chia nhóm cân bằng: chuyển ${moved} thành viên`,
            detail: { count: assignments.length, moved },
        });
        return { moved };
    }
}
