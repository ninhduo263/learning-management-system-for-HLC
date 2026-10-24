import {
    LibraryType,
    CycleType,
    ModuleFieldType,
} from "@module/learning/common/constant";
import { LearningModuleModel } from "@module/learning/models/learning-module.model";
import { ModuleCriterionModel } from "@module/learning/models/module-criterion.model";
import { ModuleFieldModel } from "@module/learning/models/module-field.model";
import { RECAP_MODULE_CODE } from "@module/learning/common/constant";
import { TargetMemberType } from "@module/member/common/constant";
import { DepartmentType } from "@module/organization/common/constant";
import { DepartmentModel } from "@module/organization/models/department.model";
import { PositionModel } from "@module/organization/models/position.model";
import { MemberPositionModel } from "@module/organization/models/member-position.model";
import { GroupKindConfigModel } from "@module/organization/models/group-kind-config.model";
import {
    GroupKind,
    RolePermission as GROUP_PERMS,
} from "@module/organization/common/constant";
import { Op } from "sequelize";
import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { createHash } from "crypto";
import { Model, ModelStatic } from "sequelize";
import {
    PointCategory,
    PointRuleKind,
    PointSourceType,
} from "../common/constant";
import { PointRuleModel } from "../models/point-rule.model";
import { PointTypeModel } from "../models/point-type.model";

/** _id cố định = 24 ký tự đầu md5(mã), giống docs/database/seed.sql */
const seedId = (key: string) =>
    createHash("md5").update(key).digest("hex").slice(0, 24);

const DEPARTMENTS = [
    { code: "BAN_HOC_TAP", name: "Ban học tập", type: DepartmentType.ACADEMIC },
    { code: "BAN_HLC_FUND", name: "Ban HLC Fund", type: DepartmentType.FUND },
    {
        code: "BAN_MENTORING",
        name: "Ban Mentoring",
        type: DepartmentType.MENTORING,
    },
];
const POSITIONS = [
    { code: "TRUONG_BAN", name: "Trưởng ban", sortOrder: 1 },
    { code: "PHO_BAN", name: "Phó ban", sortOrder: 2 },
    { code: "LEADER", name: "Leader", sortOrder: 3 },
    { code: "PHO_LEADER", name: "Phó leader", sortOrder: 4 },
];
const POINT_TYPES = [
    {
        code: "MENTORING_EARLY",
        name: "Mentoring sớm",
        category: PointCategory.MENTORING,
        sortOrder: 1,
    },
    {
        code: "MENTORING_AWARD",
        name: "Giải cặp mentoring",
        category: PointCategory.MENTORING,
        sortOrder: 2,
    },
    {
        code: "POSITION",
        name: "Phụ cấp chức vụ",
        category: PointCategory.POSITION,
        sortOrder: 3,
    },
    {
        code: "FUND",
        name: "Đóng quỹ HLC Fund",
        category: PointCategory.FUND,
        sortOrder: 4,
    },
    {
        code: "LEARNING",
        name: "Học tập",
        category: PointCategory.LEARNING,
        sortOrder: 5,
    },
    {
        code: "MANUAL_BONUS",
        name: "Cộng điểm thủ công",
        category: PointCategory.BONUS,
        sortOrder: 90,
    },
    {
        code: "MANUAL_PENALTY",
        name: "Trừ điểm thủ công",
        category: PointCategory.PENALTY,
        sortOrder: 91,
    },
];
const rule = (
    code: string,
    name: string,
    type: string,
    ruleKind: PointRuleKind,
    sourceType: PointSourceType,
    conditions: Record<string, unknown>,
    points: number,
    exclusiveGroup: string | null,
    priority: number,
    isActive = true,
) => ({
    code,
    name,
    pointTypeId: seedId(`PT:${type}`),
    ruleKind,
    sourceType,
    targetMemberType: TargetMemberType.MENTEE,
    conditions,
    points,
    exclusiveGroup,
    priority,
    isActive,
});
/** Rule hệ thống lấy điểm từ cấu hình vai trò (Tổ chức > Vai trò & điểm) */
export const ROLE_RULE_CODES = [
    "POSITION_ALLOWANCE",
    "POSITION_COMPLETION_BONUS",
];
const RULES = [
    rule(
        "MENTORING_EARLY_D1_7",
        "Mentee nộp recap trong ngày 1-7 của tháng",
        "MENTORING_EARLY",
        PointRuleKind.AUTO,
        PointSourceType.MENTORING_RECAP,
        {
            recapRole: "MENTEE",
            submittedDayFrom: 1,
            submittedDayTo: 7,
            timezone: "Asia/Ho_Chi_Minh",
        },
        2,
        "MENTORING_EARLY",
        2,
    ),
    rule(
        "MENTORING_EARLY_D8_13",
        "Mentee nộp recap từ ngày 8 đến 23:59 ngày 13 của tháng",
        "MENTORING_EARLY",
        PointRuleKind.AUTO,
        PointSourceType.MENTORING_RECAP,
        {
            recapRole: "MENTEE",
            submittedDayFrom: 8,
            submittedDayTo: 13,
            timezone: "Asia/Ho_Chi_Minh",
        },
        1,
        "MENTORING_EARLY",
        1,
    ),
    rule(
        "MENTORING_AWARD_RANK_1",
        "Cặp mentoring giải nhất",
        "MENTORING_AWARD",
        PointRuleKind.RANKING,
        PointSourceType.MENTORING_AWARD,
        { rank: 1 },
        5,
        "MENTORING_AWARD",
        3,
    ),
    rule(
        "MENTORING_AWARD_RANK_2",
        "Cặp mentoring giải nhì",
        "MENTORING_AWARD",
        PointRuleKind.RANKING,
        PointSourceType.MENTORING_AWARD,
        { rank: 2 },
        3,
        "MENTORING_AWARD",
        2,
    ),
    rule(
        "MENTORING_AWARD_RANK_3",
        "Cặp mentoring giải ba",
        "MENTORING_AWARD",
        PointRuleKind.RANKING,
        PointSourceType.MENTORING_AWARD,
        { rank: 3 },
        2,
        "MENTORING_AWARD",
        1,
    ),
    rule(
        "FUND_MONTHLY_FULL",
        "Mentee đóng đủ quỹ trong tháng",
        "FUND",
        PointRuleKind.AUTO,
        PointSourceType.FUND_MONTHLY,
        { minApprovedAmount: 150000 },
        2,
        "FUND_MONTHLY",
        1,
    ),
    // Phụ cấp chức vụ và thưởng đạt tỷ lệ: điểm lấy theo cấu hình vai trò (Position) và ngưỡng % theo loại nhóm
    {
        ...rule(
            "POSITION_ALLOWANCE",
            "Phụ cấp chức vụ (theo cấu hình vai trò)",
            "POSITION",
            PointRuleKind.POSITION,
            PointSourceType.MEMBER_POSITION,
            { fromRoleConfig: true },
            1,
            null,
            0,
        ),
        targetMemberType: TargetMemberType.ALL,
    },
    {
        ...rule(
            "POSITION_COMPLETION_BONUS",
            "Thưởng đạt tỷ lệ hoàn thành của nhóm (theo cấu hình vai trò)",
            "POSITION",
            PointRuleKind.AUTO,
            PointSourceType.GROUP_COMPLETION,
            { fromRoleConfig: true },
            1,
            null,
            0,
        ),
        targetMemberType: TargetMemberType.ALL,
    },
];
const MODULES = [
    {
        code: "READING",
        name: "Đọc sách",
        departmentId: null,
        cycleType: CycleType.MONTHLY,
        minSubmissionsPerCycle: 1,
        maxSubmissionsPerCycle: null,
        libraryType: LibraryType.BOOK,
        sortOrder: 1,
    },
    {
        code: "FAVORITE_ARTICLE",
        name: "Bài tâm đắc",
        departmentId: null,
        cycleType: CycleType.MONTHLY,
        minSubmissionsPerCycle: 1,
        maxSubmissionsPerCycle: null,
        libraryType: null,
        sortOrder: 2,
    },
    {
        code: "ACADEMIC_WEEKLY",
        name: "Bài nộp ban học tập",
        departmentId: seedId("DEPT:BAN_HOC_TAP"),
        cycleType: CycleType.WEEKLY,
        minSubmissionsPerCycle: 3,
        maxSubmissionsPerCycle: 4,
        libraryType: LibraryType.DOCUMENT,
        sortOrder: 3,
    },
];
/** Module chấm recap mentoring 1on1 (thang 100). Bài recap gốc nằm ở mentoring, module chỉ giữ tiêu chí */
const RECAP_MODULE = {
    code: RECAP_MODULE_CODE,
    name: "Recap mentoring 1on1",
    description:
        "Leader nhóm chấm recap thang 100 theo các tiêu chí dưới đây. Điểm là thành phần xếp giải Nhất, Nhì, Ba hằng tháng.",
    departmentId: null,
    cycleType: CycleType.MONTHLY,
    minSubmissionsPerCycle: 0,
    maxSubmissionsPerCycle: null,
    libraryType: null,
    sortOrder: 0,
    targetMemberType: TargetMemberType.ALL,
    settings: { source: "MENTORING_RECAP" },
};
const RECAP_CRITERIA = [
    {
        key: "content",
        name: "Nội dung đầy đủ, đúng trọng tâm buổi mentoring",
        maxScore: 40,
    },
    {
        key: "depth",
        name: "Độ sâu: bài học rút ra và kế hoạch hành động",
        maxScore: 40,
    },
    {
        key: "form",
        name: "Hình thức trình bày và ảnh minh chứng",
        maxScore: 20,
    },
];
const FIELDS = [
    {
        module: "READING",
        key: "book",
        label: "Sách đã đọc",
        fieldType: ModuleFieldType.LIBRARY_ITEM,
        isRequired: true,
        isUnique: false,
        validation: null,
        sortOrder: 1,
    },
    {
        module: "READING",
        key: "youtubeUrl",
        label: "Link YouTube video cảm nhận",
        fieldType: ModuleFieldType.YOUTUBE_URL,
        isRequired: true,
        isUnique: true,
        validation: null,
        sortOrder: 2,
    },
    {
        module: "FAVORITE_ARTICLE",
        key: "title",
        label: "Tiêu đề",
        fieldType: ModuleFieldType.TEXT,
        isRequired: true,
        isUnique: false,
        validation: { maxLength: 255 },
        sortOrder: 1,
    },
    {
        module: "FAVORITE_ARTICLE",
        key: "content",
        label: "Nội dung bài viết",
        fieldType: ModuleFieldType.LONG_TEXT,
        isRequired: false,
        isUnique: false,
        validation: null,
        sortOrder: 2,
    },
    {
        module: "FAVORITE_ARTICLE",
        key: "link",
        label: "Link bài viết",
        fieldType: ModuleFieldType.URL,
        isRequired: false,
        isUnique: false,
        validation: null,
        sortOrder: 3,
    },
    {
        module: "ACADEMIC_WEEKLY",
        key: "content",
        label: "Nội dung bài làm",
        fieldType: ModuleFieldType.LONG_TEXT,
        isRequired: true,
        isUnique: false,
        validation: null,
        sortOrder: 1,
    },
    {
        module: "ACADEMIC_WEEKLY",
        key: "images",
        label: "Ảnh bài làm",
        fieldType: ModuleFieldType.IMAGE,
        isRequired: false,
        isUnique: false,
        validation: { maxFiles: 10, maxSizeMb: 10 },
        sortOrder: 2,
    },
];

/** Tạo danh mục mặc định khi khởi động (chỉ thêm cái còn thiếu, không ghi đè chỉnh sửa của admin) */
@Injectable()
export class CatalogSeedService implements OnApplicationBootstrap {
    private readonly logger = new Logger(CatalogSeedService.name);

    constructor(
        @InjectModel(DepartmentModel)
        private readonly departmentModel: typeof DepartmentModel,
        @InjectModel(PositionModel)
        private readonly positionModel: typeof PositionModel,
        @InjectModel(PointTypeModel)
        private readonly pointTypeModel: typeof PointTypeModel,
        @InjectModel(PointRuleModel)
        private readonly pointRuleModel: typeof PointRuleModel,
        @InjectModel(LearningModuleModel)
        private readonly moduleModel: typeof LearningModuleModel,
        @InjectModel(ModuleFieldModel)
        private readonly fieldModel: typeof ModuleFieldModel,
        @InjectModel(ModuleCriterionModel)
        private readonly criterionModel: typeof ModuleCriterionModel,
        @InjectModel(MemberPositionModel)
        private readonly memberPositionModel: typeof MemberPositionModel,
        @InjectModel(GroupKindConfigModel)
        private readonly kindConfigModel: typeof GroupKindConfigModel,
    ) {}

    /**
     * Vai trò mặc định (chức vụ + quyền hạn + điểm). Lần đầu chuyển sang mô hình vai trò:
     * - LEADER / PHO_LEADER thành vai trò nhóm MTE; tạo FUND_LEADER / FUND_PHO_LEADER cho nhóm HLC Fund
     *   và chuyển các chức vụ đang gán ở nhóm Fund sang vai trò Fund;
     * - tắt các quy tắc điểm chức vụ cũ (POSITION_*), điểm lấy từ cấu hình vai trò;
     * - tạo ngưỡng % theo loại nhóm.
     */
    private async migrateRoles() {
        let changed = 0;
        const all = [
            GROUP_PERMS.VIEW_PROGRESS,
            GROUP_PERMS.SCORE_RECAP,
            GROUP_PERMS.REVIEW_FUND,
            GROUP_PERMS.PROXY_FUND,
        ];
        const fund = [
            GROUP_PERMS.VIEW_PROGRESS,
            GROUP_PERMS.REVIEW_FUND,
            GROUP_PERMS.PROXY_FUND,
        ];
        const legacyPoints = async (code: string, fallback: number) => {
            const legacy = await this.pointRuleModel.findOne({
                where: { code },
                raw: true,
            });
            return legacy && Number(legacy.points)
                ? Number(legacy.points)
                : fallback;
        };
        const roles = [
            {
                code: "LEADER",
                name: "Leader nhóm MTE",
                groupKind: GroupKind.MENTEE,
                permissions: all,
                allowancePoints: await legacyPoints("POSITION_LEADER", 2),
                bonusPoints: await legacyPoints("POSITION_LEADER_BONUS", 1),
                sortOrder: 3,
            },
            {
                code: "PHO_LEADER",
                name: "Phó nhóm MTE",
                groupKind: GroupKind.MENTEE,
                permissions: all,
                allowancePoints: await legacyPoints("POSITION_PHO_LEADER", 1),
                bonusPoints: await legacyPoints("POSITION_PHO_LEADER_BONUS", 1),
                sortOrder: 4,
            },
            {
                code: "FUND_LEADER",
                name: "Leader nhóm HLC Fund",
                groupKind: GroupKind.FUND,
                permissions: fund,
                allowancePoints: 2,
                bonusPoints: 1,
                sortOrder: 5,
            },
            {
                code: "FUND_PHO_LEADER",
                name: "Phó nhóm HLC Fund",
                groupKind: GroupKind.FUND,
                permissions: fund,
                allowancePoints: 1,
                bonusPoints: 1,
                sortOrder: 6,
            },
            {
                code: "ADMIN_HLC_FUND",
                name: "Trưởng ban HLC Fund",
                groupKind: null,
                permissions: [],
                allowancePoints: 0,
                bonusPoints: 0,
                adminScope: "FUND",
                sortOrder: 10,
            },
            {
                code: "ADMIN_MENTORING",
                name: "Trưởng ban Mentoring",
                groupKind: null,
                permissions: [],
                allowancePoints: 0,
                bonusPoints: 0,
                adminScope: "MENTORING",
                sortOrder: 11,
            },
            // Vai trò cấp ban theo bảng quyền tạm (vòng 4); Admin chỉnh được ở Vai trò & điểm
            {
                code: "TRUONG_BAN_MTE",
                name: "Trưởng ban MTE",
                groupKind: null,
                // Vòng 6: chốt kỳ và sửa điểm phụ cấp thuộc Trưởng ban HLC Fund; Trưởng ban MTE chỉ xem và đề xuất
                permissions: [GROUP_PERMS.VIEW_PAYOUT],
                scopeKinds: [GroupKind.MENTEE],
                allowancePoints: 0,
                bonusPoints: 0,
                adminScope: "MENTEE",
                sortOrder: 12,
            },
            {
                code: "PHO_BAN_MTE",
                name: "Phó ban MTE",
                groupKind: null,
                permissions: [
                    GROUP_PERMS.VIEW_PROGRESS,
                    GROUP_PERMS.SCORE_RECAP,
                    GROUP_PERMS.REVIEW_FUND,
                ],
                scopeKinds: [GroupKind.MENTEE],
                allowancePoints: 0,
                bonusPoints: 0,
                sortOrder: 13,
            },
            {
                code: "PHO_BAN_HLC_FUND",
                name: "Phó ban HLC Fund",
                groupKind: null,
                permissions: [
                    GROUP_PERMS.VIEW_PROGRESS,
                    GROUP_PERMS.REVIEW_FUND,
                ],
                scopeKinds: [GroupKind.MENTEE, GroupKind.FUND],
                allowancePoints: 0,
                bonusPoints: 0,
                sortOrder: 14,
            },
            {
                code: "TRUONG_BAN_HOC_TAP",
                name: "Trưởng ban Học tập",
                groupKind: null,
                permissions: [],
                allowancePoints: 0,
                bonusPoints: 0,
                adminScope: "LEARNING",
                sortOrder: 15,
            },
            {
                code: "KE_TOAN",
                name: "Kế toán / phụ trách chi trả",
                groupKind: null,
                permissions: [GROUP_PERMS.VIEW_PAYOUT],
                allowancePoints: 0,
                bonusPoints: 0,
                sortOrder: 16,
            },
        ];
        // Tên theo bảng quyền mới (chỉ đổi khi Admin chưa đặt tên khác)
        for (const [code, from, to] of [
            ["ADMIN_HLC_FUND", "Admin HLC Fund", "Trưởng ban HLC Fund"],
            ["ADMIN_MENTORING", "Admin Mentoring", "Trưởng ban Mentoring"],
        ]) {
            const [count] = await this.positionModel.update(
                { name: to },
                { where: { code, name: from } },
            );
            changed += count;
        }
        // Vòng 6: chuyển quyền chốt kỳ / sửa điểm của Trưởng ban MTE sang Trưởng ban HLC Fund.
        // Chỉ đổi khi cấu hình vẫn là mặc định cũ (Admin đã tự chỉnh thì giữ nguyên)
        const truongBanMte = await this.positionModel.findOne({
            where: { code: "TRUONG_BAN_MTE" },
        });
        const oldMtePermissions = [
            GROUP_PERMS.LOCK_PERIOD,
            GROUP_PERMS.EDIT_POINTS,
            GROUP_PERMS.VIEW_PAYOUT,
        ];
        const currentMtePermissions = (truongBanMte?.permissions ??
            []) as string[];
        if (
            truongBanMte &&
            currentMtePermissions.length === oldMtePermissions.length &&
            oldMtePermissions.every((item) =>
                currentMtePermissions.includes(item),
            )
        ) {
            await truongBanMte.update({
                permissions: [GROUP_PERMS.VIEW_PAYOUT],
            });
            changed += 1;
        }
        for (const role of roles) {
            const existing = await this.positionModel.findOne({
                where: { code: role.code },
            });
            if (!existing) {
                await this.positionModel.create({
                    _id: seedId(`POS:${role.code}`),
                    ...role,
                });
                changed += 1;
            } else if (
                existing.permissions === null ||
                existing.permissions === undefined
            ) {
                // Chưa cấu hình vai trò (DB cũ): áp cấu hình mặc định
                await existing.update({
                    name: role.name,
                    groupKind: role.groupKind,
                    permissions: role.permissions,
                    allowancePoints: role.allowancePoints,
                    bonusPoints: role.bonusPoints,
                    adminScope: role.adminScope ?? null,
                });
                changed += 1;
            }
        }
        // Chức vụ ở nhóm HLC Fund đang dùng vai trò nhóm MTE -> chuyển sang vai trò Fund
        const fundGroups = await this.departmentModel.findAll({
            where: { type: DepartmentType.GROUP, groupKind: GroupKind.FUND },
            attributes: ["_id"],
            raw: true,
        });
        if (fundGroups.length) {
            for (const [from, to] of [
                ["LEADER", "FUND_LEADER"],
                ["PHO_LEADER", "FUND_PHO_LEADER"],
            ]) {
                const [fromRole, toRole] = await Promise.all([
                    this.positionModel.findOne({
                        where: { code: from },
                        raw: true,
                    }),
                    this.positionModel.findOne({
                        where: { code: to },
                        raw: true,
                    }),
                ]);
                const [count] = await this.memberPositionModel.update(
                    { positionId: toRole._id },
                    {
                        where: {
                            positionId: fromRole._id,
                            departmentId: fundGroups.map((item) => item._id),
                        },
                    },
                );
                changed += count;
            }
        }
        // Điểm chức vụ chỉ định nghĩa ở Vai trò: tắt mọi quy tắc chức vụ / thưởng tỷ lệ khác
        // (rule cũ POSITION_* hoặc rule tự tạo ở màn hình điểm phụ cấp) để không cộng 2 lần
        const [legacy] = await this.pointRuleModel.update(
            { isActive: false },
            {
                where: {
                    isActive: true,
                    [Op.or]: [
                        { code: { [Op.like]: "POSITION_%" } },
                        {
                            sourceType: [
                                PointSourceType.MEMBER_POSITION,
                                PointSourceType.GROUP_COMPLETION,
                            ],
                        },
                    ],
                    [Op.not]: { code: ROLE_RULE_CODES },
                },
            },
        );
        changed += legacy;
        for (const kind of Object.values(GroupKind)) {
            const [, created] = await this.kindConfigModel.findOrCreate({
                where: { groupKind: kind },
                defaults: { groupKind: kind, completionThreshold: 90 },
            });
            if (created) changed += 1;
        }
        return changed;
    }

    /** Module RECAP: tạo nếu thiếu; tiêu chí chỉ tạo khi module chưa có tiêu chí nào */
    private async seedRecapModule() {
        const moduleId = seedId(`MOD:${RECAP_MODULE_CODE}`);
        const [module, isNew] = await this.moduleModel.findOrCreate({
            where: { code: RECAP_MODULE_CODE },
            defaults: {
                _id: moduleId,
                requireReview: true,
                enableScoring: true,
                maxScore: 100,
                ...RECAP_MODULE,
            } as never,
        });
        let created = isNew ? 1 : 0;
        if (
            !(await this.criterionModel.count({
                where: { moduleId: module._id },
            }))
        ) {
            await this.criterionModel.bulkCreate(
                RECAP_CRITERIA.map((item, index) => ({
                    _id: seedId(`CRT:${RECAP_MODULE_CODE}:${item.key}`),
                    moduleId: module._id,
                    name: item.name,
                    maxScore: item.maxScore,
                    sortOrder: index + 1,
                })),
            );
            created += RECAP_CRITERIA.length;
        }
        return created;
    }

    private async insertMissing<M extends Model>(
        model: ModelStatic<M>,
        rows: Record<string, unknown>[],
        keyOf: (row: Record<string, unknown>) => Record<string, unknown>,
    ) {
        let created = 0;
        for (const row of rows) {
            const [, isNew] = await model.findOrCreate({
                where: keyOf(row) as never,
                defaults: row as never,
            });
            if (isNew) created += 1;
        }
        return created;
    }

    async onApplicationBootstrap() {
        try {
            const created =
                (await this.insertMissing(
                    this.departmentModel,
                    DEPARTMENTS.map((row) => ({
                        _id: seedId(`DEPT:${row.code}`),
                        ...row,
                    })),
                    (row) => ({ code: row.code }),
                )) +
                (await this.insertMissing(
                    this.positionModel,
                    POSITIONS.map((row) => ({
                        _id: seedId(`POS:${row.code}`),
                        ...row,
                    })),
                    (row) => ({ code: row.code }),
                )) +
                (await this.insertMissing(
                    this.pointTypeModel,
                    POINT_TYPES.map((row) => ({
                        _id: seedId(`PT:${row.code}`),
                        isAllowance: true,
                        ...row,
                    })),
                    (row) => ({ code: row.code }),
                )) +
                (await this.insertMissing(
                    this.pointRuleModel,
                    RULES.map((row) => ({
                        _id: seedId(`PR:${row.code}`),
                        ...row,
                    })),
                    (row) => ({ code: row.code }),
                )) +
                (await this.insertMissing(
                    this.moduleModel,
                    MODULES.map((row) => ({
                        _id: seedId(`MOD:${row.code}`),
                        targetMemberType: TargetMemberType.MENTEE,
                        requireReview: true,
                        enableScoring: true,
                        maxScore: 100,
                        ...row,
                    })),
                    (row) => ({ code: row.code }),
                )) +
                (await this.insertMissing(
                    this.fieldModel,
                    FIELDS.map(({ module, ...row }) => ({
                        _id: seedId(`FLD:${module}:${row.key}`),
                        moduleId: seedId(`MOD:${module}`),
                        ...row,
                    })),
                    (row) => ({ moduleId: row.moduleId, key: row.key }),
                )) +
                (await this.seedRecapModule()) +
                (await this.migrateRoles());
            if (created)
                this.logger.log(`Đã tạo ${created} bản ghi danh mục mặc định`);
        } catch (error) {
            this.logger.error(`Không tạo được danh mục mặc định: ${error}`);
        }
    }
}
