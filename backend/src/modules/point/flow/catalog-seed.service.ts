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
    ...POSITIONS.map((position) =>
        rule(
            `POSITION_${position.code}`,
            `Phụ cấp ${position.name.toLowerCase()}`,
            "POSITION",
            PointRuleKind.POSITION,
            PointSourceType.MEMBER_POSITION,
            { positionCode: position.code },
            0,
            null,
            0,
            false,
        ),
    ),
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
    ) {}

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
                (await this.seedRecapModule());
            if (created)
                this.logger.log(`Đã tạo ${created} bản ghi danh mục mặc định`);
        } catch (error) {
            this.logger.error(`Không tạo được danh mục mặc định: ${error}`);
        }
    }
}
