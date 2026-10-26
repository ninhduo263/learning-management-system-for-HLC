import { vnParts } from "@common/utils/vn-date.util";
import { ApiError } from "@config/exception/api-error";
import {
    RECAP_MODULE_CODE,
    SubmissionReviewStatus,
} from "@module/learning/common/constant";
import { LearningModuleModel } from "@module/learning/models/learning-module.model";
import { SubmissionModel } from "@module/learning/models/submission.model";
import { MemberModel } from "@module/member/models/member.model";
import { MemberType } from "@module/member/common/constant";
import { ModuleAudienceService } from "@module/learning/flow/module-audience.service";
import { MentoringRole } from "@module/mentoring/common/constant";
import { MentoringRecapModel } from "@module/mentoring/models/mentoring-recap.model";
import { MentoringSessionModel } from "@module/mentoring/models/mentoring-session.model";
import { GroupKind } from "@module/organization/common/constant";
import { GroupAccessService } from "@module/organization/flow/group-access.service";
import { AdminScope } from "@module/permission/common/constant";
import { PeriodModel } from "@module/period/models/period.model";
import { TimeService } from "@module/time/time.service";
import { SystemRole } from "@module/user/common/constant";
import { User } from "@module/user/entities/user.entity";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Op } from "sequelize";

const round2 = (value: number) => Math.round(value * 100) / 100;
const mean = (values: number[]) =>
    values.length
        ? round2(values.reduce((sum, item) => sum + item, 0) / values.length)
        : null;
const pad = (value: number) => String(value).padStart(2, "0");
const TREND_MONTHS = 6;

interface Item {
    memberId: string;
    moduleId: string;
    periodCode: string;
    /** Điểm quy về thang 100 */
    score: number;
    kind: "MODULE" | "RECAP";
}

export interface LearningAverageQuery {
    /** YYYY-MM */
    period?: string;
    /** YYYYQn (3 tháng của quý) */
    quarter?: string;
    groupId?: string;
    moduleId?: string;
    memberType?: string;
}

/**
 * Điểm trung bình học tập là của TỪNG CÁ NHÂN MTE, tính THEO THÁNG: mỗi MTE có 1 giá trị mỗi tháng = trung bình
 * điểm các bài đã chấm của các module MTE được gán và điểm recap mentoring của tháng đó, quy về thang 100.
 * Nhóm / module / toàn bộ = tổng hợp từ điểm từng MTE (không gộp theo số bài). Điểm recap LẤY TRỰC TIẾP từ dữ liệu mentoring, không sao chép.
 * Xem được theo MTE, nhóm, module, tháng và quý. Admin toàn cục và Trưởng ban Học tập xem tất cả; Admin module
 * nhỏ chỉ xem module mình quản lý. Phần mentoring chỉ để xem: điều chỉnh thì gửi đề xuất cho Trưởng ban Mentoring.
 */
@Injectable()
export class LearningAverageService {
    constructor(
        private readonly timeService: TimeService,
        private readonly groupAccess: GroupAccessService,
        @InjectModel(PeriodModel)
        private readonly periodModel: typeof PeriodModel,
        @InjectModel(SubmissionModel)
        private readonly submissionModel: typeof SubmissionModel,
        @InjectModel(LearningModuleModel)
        private readonly moduleModel: typeof LearningModuleModel,
        @InjectModel(MemberModel)
        private readonly memberModel: typeof MemberModel,
        @InjectModel(MentoringRecapModel)
        private readonly recapModel: typeof MentoringRecapModel,
        @InjectModel(MentoringSessionModel)
        private readonly sessionModel: typeof MentoringSessionModel,
        private readonly audience: ModuleAudienceService,
    ) {}

    /** Quyền xem: null = mọi module; danh sách = chỉ các module đó (Admin module nhỏ) */
    private async access(user: User): Promise<string[] | null> {
        if (user.systemRole === SystemRole.ADMIN) return null;
        const caps = await this.groupAccess.capabilities(user);
        if (caps.scopes.has(AdminScope.LEARNING)) return null;
        if (caps.moduleIds?.length) return caps.moduleIds;
        throw ApiError.Forbidden("error-forbidden");
    }

    /** Các tháng của khoảng xem (YYYY-MM) và nhãn */
    private range(query: LearningAverageQuery) {
        if (query.quarter) {
            const match = /^(\d{4})-?Q([1-4])$/i.exec(query.quarter.trim());
            if (!match)
                throw ApiError.BadRequest("error-period-not-found", {
                    code: query.quarter,
                });
            const year = Number(match[1]);
            const q = Number(match[2]);
            const months = [0, 1, 2].map(
                (offset) => `${year}-${pad((q - 1) * 3 + 1 + offset)}`,
            );
            return {
                months,
                label: `Quý ${q}/${year}`,
                mode: "QUARTER" as const,
                code: `${year}Q${q}`,
            };
        }
        const code =
            query.period ??
            (() => {
                const now = vnParts(this.timeService.now());
                return `${now.year}-${pad(now.month)}`;
            })();
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(code))
            throw ApiError.BadRequest("error-period-not-found", { code });
        return {
            months: [code],
            label: `Tháng ${code.slice(5)}/${code.slice(0, 4)}`,
            mode: "MONTH" as const,
            code,
        };
    }

    /** 6 tháng kết thúc ở tháng cuối của khoảng xem: dữ liệu biểu đồ xu hướng */
    private trendMonths(last: string) {
        let year = Number(last.slice(0, 4));
        let month = Number(last.slice(5));
        const months: string[] = [];
        for (let index = 0; index < TREND_MONTHS; index += 1) {
            months.unshift(`${year}-${pad(month)}`);
            month -= 1;
            if (month === 0) {
                month = 12;
                year -= 1;
            }
        }
        return months;
    }

    async average(user: User, query: LearningAverageQuery) {
        const moduleScope = await this.access(user);
        const range = this.range(query);
        const trend = this.trendMonths(range.months[range.months.length - 1]);
        const allMonths = [...new Set([...trend, ...range.months])];
        const periods = await this.periodModel.findAll({
            where: {
                [Op.or]: allMonths.map((code) => ({
                    year: Number(code.slice(0, 4)),
                    month: Number(code.slice(5)),
                })),
            },
            raw: true,
        });
        const codeOf = new Map(
            periods.map((period) => [
                period._id,
                `${period.year}-${pad(period.month)}`,
            ]),
        );

        const modules = await this.moduleModel.findAll({
            where: moduleScope ? { _id: moduleScope } : {},
            raw: true,
        });
        const recapModule = await this.moduleModel.findOne({
            where: { code: RECAP_MODULE_CODE },
            raw: true,
        });
        const moduleOf = new Map(modules.map((module) => [module._id, module]));
        // Điểm recap mentoring: chỉ khi được xem toàn bộ, hoặc được giao đúng module "Recap mentoring"
        const includeRecap =
            Boolean(recapModule) &&
            (!moduleScope || moduleScope.includes(recapModule._id));
        if (recapModule && !moduleOf.has(recapModule._id) && includeRecap)
            moduleOf.set(recapModule._id, recapModule);
        if (query.moduleId && !moduleOf.has(query.moduleId))
            throw ApiError.Forbidden("error-learning-module-forbidden");

        const items: Item[] = [];
        const wantModule = (id: string) =>
            !query.moduleId || query.moduleId === id;

        const submissions = periods.length
            ? await this.submissionModel.findAll({
                  where: {
                      periodId: periods.map((period) => period._id),
                      moduleId: [...moduleOf.keys()],
                      totalScore: { [Op.ne]: null },
                      reviewStatus: {
                          [Op.ne]: SubmissionReviewStatus.REJECTED,
                      },
                  },
                  raw: true,
              })
            : [];
        // Chỉ module MTE được gán (đối tượng module + danh sách gán người / nhóm)
        const targets = await this.audience.resolver();
        const submitters = new Map(
            (submissions.length
                ? await this.memberModel.findAll({
                      where: {
                          _id: [
                              ...new Set(
                                  submissions.map((row) => row.memberId),
                              ),
                          ],
                      },
                      attributes: ["_id", "memberType"],
                      raw: true,
                  })
                : []
            ).map((member) => [member._id, member]),
        );
        for (const row of submissions) {
            const module = moduleOf.get(row.moduleId);
            if (
                !module ||
                module.code === RECAP_MODULE_CODE ||
                !wantModule(row.moduleId) ||
                !targets(module, submitters.get(row.memberId))
            )
                continue;
            const max = Number(module.maxScore ?? 100) || 100;
            items.push({
                memberId: row.memberId,
                moduleId: row.moduleId,
                periodCode: codeOf.get(row.periodId),
                score: (Number(row.totalScore) / max) * 100,
                kind: "MODULE",
            });
        }
        if (
            includeRecap &&
            recapModule &&
            wantModule(recapModule._id) &&
            periods.length
        ) {
            const sessions = await this.sessionModel.findAll({
                where: { periodId: periods.map((period) => period._id) },
                attributes: ["_id", "periodId"],
                raw: true,
            });
            const sessionPeriod = new Map(
                sessions.map((item) => [item._id, item.periodId]),
            );
            const recaps = sessions.length
                ? await this.recapModel.findAll({
                      where: {
                          sessionId: sessions.map((item) => item._id),
                          role: MentoringRole.MENTEE,
                          score: { [Op.ne]: null },
                      },
                      raw: true,
                  })
                : [];
            const max = Number(recapModule.maxScore ?? 100) || 100;
            for (const recap of recaps)
                items.push({
                    memberId: recap.memberId,
                    moduleId: recapModule._id,
                    periodCode: codeOf.get(sessionPeriod.get(recap.sessionId)),
                    score: (Number(recap.score) / max) * 100,
                    kind: "RECAP",
                });
        }

        // Thành viên, nhóm
        const memberIds = [...new Set(items.map((item) => item.memberId))];
        const members = new Map(
            (memberIds.length
                ? await this.memberModel.findAll({
                      where: { _id: memberIds },
                      raw: true,
                  })
                : []
            ).map((member) => [member._id, member]),
        );
        const groups = await this.groupAccess.groups(true, GroupKind.MENTEE);
        const groupById = new Map(groups.map((group) => [group._id, group]));
        const memberships = await this.groupAccess.currentMemberships(
            groups.map((group) => group._id),
        );
        const groupOfMember = new Map<string, { _id: string; name: string }>();
        for (const row of memberships) {
            const group = groupById.get(row.groupId);
            if (group)
                groupOfMember.set(row.memberId, {
                    _id: group._id,
                    name: group.name,
                });
        }

        const inRange = (item: Item) => range.months.includes(item.periodCode);
        // Điểm trung bình học tập là của từng cá nhân MTE
        const wantMember = (item: Item) => {
            const member = members.get(item.memberId);
            if (!member) return false;
            if (member.memberType !== MemberType.MENTEE) return false;
            if (
                query.groupId &&
                groupOfMember.get(item.memberId)?._id !== query.groupId
            )
                return false;
            return true;
        };
        const scoped = items.filter(wantMember);
        const current = scoped.filter(inRange);

        // Đơn vị gốc: điểm trung bình của từng MTE trong từng tháng (trung bình các bài đã chấm của tháng)
        const monthly = new Map<string, Item[]>();
        for (const item of scoped) {
            const key = `${item.memberId}|${item.periodCode}`;
            monthly.set(key, [...(monthly.get(key) ?? []), item]);
        }
        const memberMonth = (memberId: string, code: string) => {
            const own = monthly.get(`${memberId}|${code}`) ?? [];
            return own.length ? mean(own.map((item) => item.score)) : null;
        };
        const memberIdsInRange = [
            ...new Set(current.map((item) => item.memberId)),
        ];

        const byMember = memberIdsInRange
            .map((memberId) => {
                const own = current.filter(
                    (item) => item.memberId === memberId,
                );
                const member = members.get(memberId);
                const months = Object.fromEntries(
                    range.months.map((code) => [
                        code,
                        memberMonth(memberId, code),
                    ]),
                );
                const values = Object.values(months).filter(
                    (value): value is number => value !== null,
                );
                return {
                    member: {
                        _id: member._id,
                        memberCode: member.memberCode,
                        fullName: member.fullName,
                        memberType: member.memberType,
                        phone: member.phone ?? null,
                    },
                    group: groupOfMember.get(memberId) ?? null,
                    /** Tháng: điểm của tháng; quý: trung bình các điểm tháng */
                    average: mean(values),
                    /** Điểm trung bình từng tháng của khoảng xem */
                    months,
                    learningAverage: mean(
                        own
                            .filter((item) => item.kind === "MODULE")
                            .map((item) => item.score),
                    ),
                    recapAverage: mean(
                        own
                            .filter((item) => item.kind === "RECAP")
                            .map((item) => item.score),
                    ),
                    scoredItems: own.length,
                };
            })
            .sort((a, b) => (b.average ?? 0) - (a.average ?? 0));
        const averageOf = (ids: string[]) =>
            mean(
                byMember
                    .filter((row) => ids.includes(row.member._id))
                    .map((row) => row.average)
                    .filter((value): value is number => value !== null),
            );

        // Nhóm: tổng hợp từ điểm từng MTE (trung bình các điểm cá nhân)
        const groupKeys = [
            ...new Set(byMember.map((row) => row.group?._id ?? "NONE")),
        ];
        const byGroup = groupKeys
            .map((key) => {
                const ids = byMember
                    .filter((row) => (row.group?._id ?? "NONE") === key)
                    .map((row) => row.member._id);
                const group = key === "NONE" ? null : groupById.get(key);
                return {
                    group: group
                        ? { _id: group._id, name: group.name }
                        : { _id: null, name: "Chưa có nhóm" },
                    average: averageOf(ids),
                    members: ids.length,
                    scoredItems: current.filter((item) =>
                        ids.includes(item.memberId),
                    ).length,
                };
            })
            .sort((a, b) => (b.average ?? 0) - (a.average ?? 0));

        // Module: trung bình điểm từng MTE ở module đó
        const byModule = [...new Set(current.map((item) => item.moduleId))]
            .map((id) => {
                const own = current.filter((item) => item.moduleId === id);
                const module = moduleOf.get(id);
                const perMember = [
                    ...new Set(own.map((item) => item.memberId)),
                ].map((memberId) =>
                    mean(
                        own
                            .filter((item) => item.memberId === memberId)
                            .map((item) => item.score),
                    ),
                );
                return {
                    module: {
                        _id: id,
                        code: module.code,
                        name:
                            module.code === RECAP_MODULE_CODE
                                ? "Recap mentoring"
                                : module.name,
                        isRecap: module.code === RECAP_MODULE_CODE,
                    },
                    average: mean(
                        perMember.filter(
                            (value): value is number => value !== null,
                        ),
                    ),
                    members: perMember.length,
                    scoredItems: own.length,
                };
            })
            .sort((a, b) => (b.average ?? 0) - (a.average ?? 0));

        // Xu hướng: mỗi tháng = trung bình điểm tháng của các MTE có điểm trong tháng
        const byMonth = trend.map((code) => {
            const own = scoped.filter((item) => item.periodCode === code);
            const ids = [...new Set(own.map((item) => item.memberId))];
            const perMember = (kind?: Item["kind"]) =>
                mean(
                    ids
                        .map((memberId) =>
                            mean(
                                own
                                    .filter(
                                        (item) =>
                                            item.memberId === memberId &&
                                            (!kind || item.kind === kind),
                                    )
                                    .map((item) => item.score),
                            ),
                        )
                        .filter((value): value is number => value !== null),
                );
            return {
                period: code,
                average: perMember(),
                learningAverage: perMember("MODULE"),
                recapAverage: perMember("RECAP"),
                members: ids.length,
                scoredItems: own.length,
            };
        });

        // Nửa trên là "điểm cao", nửa dưới là "cần cải thiện" (tối đa 5 người mỗi bên, không trùng nhau)
        const half = Math.ceil(byMember.length / 2);
        const top = byMember.slice(0, Math.min(5, half));
        const needImprovement = byMember.slice(half).reverse().slice(0, 5);

        return {
            range: {
                label: range.label,
                mode: range.mode,
                code: range.code,
                months: range.months,
            },
            /** false = chỉ thấy module mình quản lý (Admin module nhỏ) */
            canViewAll: !moduleScope,
            /** Trung bình của các điểm cá nhân MTE (đơn vị gốc là từng MTE) */
            overall: {
                average: averageOf(byMember.map((row) => row.member._id)),
                learningAverage: mean(
                    current
                        .filter((item) => item.kind === "MODULE")
                        .map((item) => item.score),
                ),
                recapAverage: mean(
                    current
                        .filter((item) => item.kind === "RECAP")
                        .map((item) => item.score),
                ),
                members: byMember.length,
                scoredItems: current.length,
            },
            byMember,
            byGroup,
            byModule,
            byMonth,
            top,
            needImprovement,
            /** Cho bộ lọc trên giao diện */
            filters: {
                groups: groups.map((group) => ({
                    _id: group._id,
                    name: group.name,
                })),
                modules: [...moduleOf.values()].map((module) => ({
                    _id: module._id,
                    name:
                        module.code === RECAP_MODULE_CODE
                            ? "Recap mentoring"
                            : module.name,
                    isRecap: module.code === RECAP_MODULE_CODE,
                })),
            },
        };
    }
}
