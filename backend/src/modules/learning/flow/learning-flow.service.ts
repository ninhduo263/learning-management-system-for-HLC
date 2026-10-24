import { ModuleAudienceService } from "./module-audience.service";
import { ModuleAdminService } from "./module-admin.service";
import { GroupAccessService } from "@module/organization/flow/group-access.service";
import {
    vnDateKey,
    vnIsoWeekKey,
    vnParts,
    monthKey,
} from "@common/utils/vn-date.util";
import { ApiError } from "@config/exception/api-error";
import { AttachmentFlowService } from "@module/attachment/attachment-flow.service";
import { AttachmentOwnerType } from "@module/attachment/common/constant";
import {
    MemberStatus,
    MemberType,
    TargetMemberType,
} from "@module/member/common/constant";
import { Member } from "@module/member/entities/member.entity";
import { MemberModel } from "@module/member/models/member.model";
import { PeriodFlowService } from "@module/period/flow/period-flow.service";
import { AdminPermissionModel } from "@module/permission/models/admin-permission.model";
import { TimeService } from "@module/time/time.service";
import { SystemRole } from "@module/user/common/constant";
import { User } from "@module/user/entities/user.entity";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Op, Transaction, WhereOptions } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import {
    CycleType,
    LEARNING_MODULE_CODE_PREFIX,
    RECAP_MODULE_CODE,
    ModuleFieldType,
    SubmissionReviewStatus,
    SubmissionStatus,
} from "../common/constant";
import { LearningModule } from "../entities/learning-module.entity";
import { ModuleField } from "../entities/module-field.entity";
import { Submission } from "../entities/submission.entity";
import { LearningModuleModel } from "../models/learning-module.model";
import { LibraryItemModel } from "../models/library-item.model";
import { ModuleCriterionModel } from "../models/module-criterion.model";
import { ModuleFieldModel } from "../models/module-field.model";
import { SubmissionScoreModel } from "../models/submission-score.model";
import { SubmissionUniqueValueModel } from "../models/submission-unique-value.model";
import { SubmissionModel } from "../models/submission.model";
import { LibraryItemDto } from "./dto/library-item.dto";
import { ModuleConfigDto } from "./dto/module-config.dto";
import { ReviewSubmissionDto } from "./dto/review-submission.dto";

/** Lấy mã video YouTube (11 ký tự) từ các dạng link phổ biến */
export function youtubeId(value: string): string | null {
    const text = String(value ?? "").trim();
    const patterns = [
        /youtu\.be\/([A-Za-z0-9_-]{11})/,
        /youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/|v\/)([A-Za-z0-9_-]{11})/,
    ];
    for (const pattern of patterns) {
        const match = pattern.exec(text);
        if (match) return match[1];
    }
    return null;
}

const isUrl = (value: string) =>
    /^https?:\/\/\S+\.\S+/.test(String(value ?? "").trim());

export function cycleKeyOf(cycleType: CycleType | string, now: Date) {
    const { year, month } = vnParts(now);
    switch (cycleType) {
        case CycleType.DAILY:
            return vnDateKey(now);
        case CycleType.WEEKLY:
            return vnIsoWeekKey(now);
        case CycleType.ONCE:
            return "ONCE";
        default:
            return monthKey(year, month);
    }
}

@Injectable()
export class LearningFlowService {
    constructor(
        private readonly sequelize: Sequelize,
        private readonly timeService: TimeService,
        private readonly periodFlow: PeriodFlowService,
        private readonly attachments: AttachmentFlowService,
        @InjectModel(LearningModuleModel)
        private readonly moduleModel: typeof LearningModuleModel,
        @InjectModel(ModuleFieldModel)
        private readonly fieldModel: typeof ModuleFieldModel,
        @InjectModel(ModuleCriterionModel)
        private readonly criterionModel: typeof ModuleCriterionModel,
        @InjectModel(LibraryItemModel)
        private readonly libraryModel: typeof LibraryItemModel,
        @InjectModel(SubmissionModel)
        private readonly submissionModel: typeof SubmissionModel,
        @InjectModel(SubmissionScoreModel)
        private readonly scoreModel: typeof SubmissionScoreModel,
        @InjectModel(SubmissionUniqueValueModel)
        private readonly uniqueModel: typeof SubmissionUniqueValueModel,
        @InjectModel(MemberModel)
        private readonly memberModel: typeof MemberModel,
        @InjectModel(AdminPermissionModel)
        private readonly permissionModel: typeof AdminPermissionModel,
        private readonly groupAccess: GroupAccessService,
        private readonly audience: ModuleAudienceService,
        private readonly moduleAdmins: ModuleAdminService,
    ) {}

    // ------------------------------------------------------------------
    // Quyền
    // ------------------------------------------------------------------

    /** null = quản lý mọi module (Admin tổng) */
    async manageableModuleIds(user: User): Promise<string[] | null> {
        if (user.systemRole === SystemRole.ADMIN) return null;
        // Trưởng ban học tập / Trưởng ban MTE: mọi module; Admin module nhỏ: module được giao theo chức vụ
        return (await this.groupAccess.capabilities(user)).moduleIds;
    }

    async assertCanManage(user: User, moduleId: string) {
        const ids = await this.manageableModuleIds(user);
        if (ids && !ids.includes(moduleId))
            throw ApiError.Forbidden("error-learning-module-forbidden");
    }

    private async getModule(id: string, t?: Transaction) {
        const module = await this.moduleModel.findByPk(id, {
            raw: true,
            transaction: t,
        });
        if (!module) throw ApiError.NotFound("error-learning-module-not-found");
        return module as LearningModule;
    }

    private async memberOf(user: User) {
        const member = await this.memberModel.findOne({
            where: { userId: user._id },
            raw: true,
        });
        if (!member) throw ApiError.NotFound("error-member-not-linked");
        return member as Member;
    }

    /** Đối tượng của module (loại thành viên + danh sách được gán) */
    private async targetsFn() {
        return this.audience.resolver();
    }

    // ------------------------------------------------------------------
    // Cấu hình module
    // ------------------------------------------------------------------

    private async moduleDetails(modules: LearningModule[]) {
        const ids = modules.map((module) => module._id);
        const fields = ids.length
            ? await this.fieldModel.findAll({
                  where: { moduleId: ids, isActive: true },
                  order: [["sortOrder", "ASC"]],
                  raw: true,
              })
            : [];
        const criteria = ids.length
            ? await this.criterionModel.findAll({
                  where: { moduleId: ids },
                  order: [["sortOrder", "ASC"]],
                  raw: true,
              })
            : [];
        const admins = await this.moduleAdmins.holdersByModule(ids);
        return modules.map((module) => ({
            ...module,
            maxScore: Number(module.maxScore ?? 100),
            /** Người giữ chức vụ "Admin module <tên>" */
            adminMembers: admins.get(module._id) ?? [],
            fields: fields.filter((field) => field.moduleId === module._id),
            criteria: criteria
                .filter((item) => item.moduleId === module._id)
                .map((item) => ({
                    ...item,
                    maxScore: Number(item.maxScore),
                    weight: Number(item.weight ?? 1),
                })),
        }));
    }

    async listModules(user: User) {
        const ids = await this.manageableModuleIds(user);
        const modules = await this.moduleModel.findAll({
            where: ids ? { _id: ids } : {},
            order: [
                ["sortOrder", "ASC"],
                ["code", "ASC"],
            ],
            raw: true,
        });
        const details = await this.moduleDetails(modules);
        const pending = await this.submissionModel.findAll({
            attributes: [
                "moduleId",
                [
                    this.sequelize.fn("COUNT", this.sequelize.col("_id")),
                    "count",
                ],
            ],
            where: {
                moduleId: modules.map((module) => module._id),
                status: SubmissionStatus.SUBMITTED,
                reviewStatus: SubmissionReviewStatus.PENDING,
            },
            group: ["moduleId"],
            raw: true,
        });
        const pendingMap = new Map(
            pending.map((row) => [
                row.moduleId,
                Number((row as unknown as { count: string }).count),
            ]),
        );
        return details.map((module) => ({
            ...module,
            isRecapModule: module.code === RECAP_MODULE_CODE,
            pendingReviews: pendingMap.get(module._id) ?? 0,
        }));
    }

    async getModuleDetail(user: User, id: string) {
        await this.assertCanManage(user, id);
        const [module] = await this.moduleDetails([await this.getModule(id)]);
        return module;
    }

    private async nextModuleCode(t: Transaction) {
        const rows = await this.moduleModel.findAll({
            where: { code: { [Op.like]: `${LEARNING_MODULE_CODE_PREFIX}%` } },
            attributes: ["code"],
            raw: true,
            transaction: t,
        });
        const max = rows.reduce(
            (value, row) =>
                Math.max(
                    value,
                    Number(
                        row.code.slice(LEARNING_MODULE_CODE_PREFIX.length),
                    ) || 0,
                ),
            0,
        );
        return `${LEARNING_MODULE_CODE_PREFIX}${String(max + 1).padStart(4, "0")}`;
    }

    private validateConfig(dto: ModuleConfigDto) {
        const keys = new Set<string>();
        for (const field of dto.fields) {
            if (keys.has(field.key))
                throw ApiError.BadRequest("error-module-field-key-exist", {
                    key: field.key,
                });
            keys.add(field.key);
        }
        if (
            dto.maxSubmissionsPerCycle &&
            dto.minSubmissionsPerCycle &&
            dto.maxSubmissionsPerCycle < dto.minSubmissionsPerCycle
        ) {
            throw ApiError.BadRequest("error-submission-limit", {
                max: dto.maxSubmissionsPerCycle,
                cycle: dto.cycleType,
            });
        }
    }

    private async saveConfig(
        moduleId: string,
        dto: ModuleConfigDto,
        t: Transaction,
    ) {
        const existingFields = await this.fieldModel.findAll({
            where: { moduleId },
            transaction: t,
        });
        const keep = new Set<string>();
        for (const [index, field] of dto.fields.entries()) {
            const current = existingFields.find(
                (item) => item._id === field._id || item.key === field.key,
            );
            const values = {
                key: field.key,
                label: field.label,
                fieldType: field.fieldType,
                isRequired: field.isRequired ?? false,
                isUnique:
                    field.isUnique ??
                    field.fieldType === ModuleFieldType.YOUTUBE_URL,
                options: field.options ?? null,
                validation: field.validation ?? null,
                sortOrder: index + 1,
                isActive: true,
            };
            if (current) {
                await current.update(values, { transaction: t });
                keep.add(current._id);
            } else {
                const created = await this.fieldModel.create(
                    { moduleId, ...values },
                    { transaction: t },
                );
                keep.add(created._id);
            }
        }
        // Trường bị bỏ: tắt (giữ lại để bài nộp cũ vẫn hiển thị)
        for (const field of existingFields) {
            if (!keep.has(field._id))
                await field.update({ isActive: false }, { transaction: t });
        }
        if (dto.criteria) {
            const existingCriteria = await this.criterionModel.findAll({
                where: { moduleId },
                transaction: t,
            });
            const keepCriteria = new Set<string>();
            for (const [index, item] of dto.criteria.entries()) {
                const current = existingCriteria.find(
                    (row) => row._id === item._id,
                );
                const values = {
                    name: item.name,
                    description: item.description ?? null,
                    maxScore: item.maxScore,
                    sortOrder: index + 1,
                };
                if (current) {
                    await current.update(values, { transaction: t });
                    keepCriteria.add(current._id);
                } else {
                    const created = await this.criterionModel.create(
                        { moduleId, ...values },
                        { transaction: t },
                    );
                    keepCriteria.add(created._id);
                }
            }
            for (const item of existingCriteria) {
                if (keepCriteria.has(item._id)) continue;
                const used = await this.scoreModel.count({
                    where: { criterionId: item._id },
                    transaction: t,
                });
                if (!used) await item.destroy({ transaction: t });
            }
        }
    }

    private moduleValues(dto: ModuleConfigDto) {
        return {
            name: dto.name.trim(),
            description: dto.description ?? null,
            departmentId: dto.departmentId || null,
            targetMemberType: dto.targetMemberType ?? TargetMemberType.MENTEE,
            cycleType: dto.cycleType,
            minSubmissionsPerCycle: dto.minSubmissionsPerCycle ?? 0,
            maxSubmissionsPerCycle: dto.maxSubmissionsPerCycle ?? null,
            libraryType: dto.libraryType ?? null,
            requireReview: dto.requireReview ?? true,
            enableScoring: dto.enableScoring ?? true,
            maxScore: dto.maxScore ?? 100,
            ...(dto.isActive !== undefined && { isActive: dto.isActive }),
            ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        };
    }

    async createModule(user: User, dto: ModuleConfigDto) {
        this.validateConfig(dto);
        const id = await this.sequelize.transaction(async (t) => {
            const module = await this.moduleModel.create(
                {
                    code: await this.nextModuleCode(t),
                    ...this.moduleValues(dto),
                    createdBy: user._id,
                },
                { transaction: t },
            );
            await this.saveConfig(module._id, dto, t);
            return module._id;
        });
        // Đối tượng áp dụng và người giữ chức vụ Admin module chọn ngay khi tạo (ghi nhật ký)
        if (dto.audience) await this.audience.save(user, id, dto.audience);
        if (dto.adminMemberIds?.length)
            await this.moduleAdmins.save(user, id, dto.adminMemberIds);
        return this.getModuleDetail(user, id);
    }

    async updateModule(user: User, id: string, dto: ModuleConfigDto) {
        await this.assertCanManage(user, id);
        await this.getModule(id);
        this.validateConfig(dto);
        await this.sequelize.transaction(async (t) => {
            await this.moduleModel.update(this.moduleValues(dto), {
                where: { _id: id },
                transaction: t,
            });
            await this.saveConfig(id, dto, t);
        });
        await this.moduleAdmins.syncName(await this.getModule(id));
        return this.getModuleDetail(user, id);
    }

    // ------------------------------------------------------------------
    // Thư viện
    // ------------------------------------------------------------------

    async listLibrary(type?: string, includeInactive = false) {
        return this.libraryModel.findAll({
            where: {
                ...(type && { libraryType: type }),
                ...(!includeInactive && { isActive: true }),
            },
            order: [["title", "ASC"]],
            raw: true,
        });
    }

    async saveLibraryItem(user: User, dto: LibraryItemDto, id?: string) {
        if (id) {
            const item = await this.libraryModel.findByPk(id);
            if (!item) throw ApiError.NotFound("error-record-not-found");
            await item.update(dto);
            return item.get({ plain: true });
        }
        const item = await this.libraryModel.create({
            ...dto,
            createdBy: user._id,
        });
        return item.get({ plain: true });
    }

    async removeLibraryItem(id: string) {
        const item = await this.libraryModel.findByPk(id);
        if (!item) throw ApiError.NotFound("error-record-not-found");
        const used = await this.submissionModel.count({
            where: { libraryItemId: id },
        });
        if (used) await item.update({ isActive: false });
        else await item.destroy();
        return { deleted: !used, deactivated: Boolean(used) };
    }

    // ------------------------------------------------------------------
    // Nộp bài
    // ------------------------------------------------------------------

    /** Kiểm tra + chuẩn hóa dữ liệu form; trả về dữ liệu lưu, file theo trường, giá trị cần chặn trùng */
    private async normalizeData(
        module: LearningModule,
        fields: ModuleField[],
        input: Record<string, unknown>,
    ) {
        const data: Record<string, unknown> = {};
        const files: { key: string; fileIds: string[] }[] = [];
        const uniques: { field: ModuleField; value: string }[] = [];
        let libraryItemId: string | null = null;
        for (const field of fields) {
            const raw = input?.[field.key];
            const label = field.label;
            const empty =
                raw === undefined ||
                raw === null ||
                (typeof raw === "string" && !raw.trim()) ||
                (Array.isArray(raw) && !raw.length);
            if (empty) {
                if (field.isRequired)
                    throw ApiError.BadRequest(
                        "error-submission-field-required",
                        { label },
                    );
                continue;
            }
            const rules = (field.validation ?? {}) as Record<string, number>;
            const invalid = () =>
                ApiError.BadRequest("error-submission-field-invalid", {
                    label,
                });
            switch (field.fieldType) {
                case ModuleFieldType.TEXT:
                case ModuleFieldType.LONG_TEXT: {
                    const text = String(raw).trim();
                    if (rules.maxLength && text.length > rules.maxLength)
                        throw invalid();
                    if (rules.minLength && text.length < rules.minLength)
                        throw invalid();
                    data[field.key] = text;
                    break;
                }
                case ModuleFieldType.URL: {
                    if (!isUrl(String(raw))) throw invalid();
                    data[field.key] = String(raw).trim();
                    break;
                }
                case ModuleFieldType.YOUTUBE_URL: {
                    const videoId = youtubeId(String(raw));
                    if (!videoId) throw invalid();
                    data[field.key] =
                        `https://www.youtube.com/watch?v=${videoId}`;
                    if (field.isUnique) uniques.push({ field, value: videoId });
                    break;
                }
                case ModuleFieldType.NUMBER: {
                    const number = Number(raw);
                    if (!Number.isFinite(number)) throw invalid();
                    if (rules.min !== undefined && number < rules.min)
                        throw invalid();
                    if (rules.max !== undefined && number > rules.max)
                        throw invalid();
                    data[field.key] = number;
                    break;
                }
                case ModuleFieldType.DATE: {
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(raw)))
                        throw invalid();
                    data[field.key] = String(raw);
                    break;
                }
                case ModuleFieldType.SELECT: {
                    const options = (field.options ?? []).map(String);
                    if (options.length && !options.includes(String(raw)))
                        throw invalid();
                    data[field.key] = String(raw);
                    break;
                }
                case ModuleFieldType.MULTI_SELECT: {
                    const values = (Array.isArray(raw) ? raw : [raw]).map(
                        String,
                    );
                    const options = (field.options ?? []).map(String);
                    if (
                        options.length &&
                        values.some((value) => !options.includes(value))
                    )
                        throw invalid();
                    data[field.key] = values;
                    break;
                }
                case ModuleFieldType.LIBRARY_ITEM: {
                    const item = await this.libraryModel.findByPk(String(raw), {
                        raw: true,
                    });
                    if (
                        !item ||
                        !item.isActive ||
                        (module.libraryType &&
                            item.libraryType !== module.libraryType)
                    )
                        throw invalid();
                    data[field.key] = item._id;
                    libraryItemId = item._id;
                    break;
                }
                case ModuleFieldType.IMAGE:
                case ModuleFieldType.FILE: {
                    const fileIds = (Array.isArray(raw) ? raw : [raw]).map(
                        String,
                    );
                    if (rules.maxFiles && fileIds.length > rules.maxFiles)
                        throw invalid();
                    const loaded = await this.attachments.loadFiles(fileIds, {
                        requireImage: field.fieldType === ModuleFieldType.IMAGE,
                    });
                    if (
                        rules.maxSizeMb &&
                        loaded.some(
                            (file) =>
                                Number(file.size) >
                                rules.maxSizeMb * 1024 * 1024,
                        )
                    )
                        throw invalid();
                    data[field.key] = fileIds;
                    files.push({ key: field.key, fileIds });
                    break;
                }
                default:
                    data[field.key] = raw;
            }
        }
        return { data, files, uniques, libraryItemId };
    }

    private async countInCycle(
        moduleId: string,
        memberId: string,
        cycleKey: string,
        exceptId?: string,
        t?: Transaction,
    ) {
        return this.submissionModel.count({
            where: {
                moduleId,
                memberId,
                cycleKey,
                status: SubmissionStatus.SUBMITTED,
                reviewStatus: { [Op.ne]: SubmissionReviewStatus.REJECTED },
                ...(exceptId && { _id: { [Op.ne]: exceptId } }),
            },
            transaction: t,
        });
    }

    async submit(
        user: User,
        moduleId: string,
        input: Record<string, unknown>,
        submissionId?: string,
    ) {
        const member = await this.memberOf(user);
        const module = await this.getModule(moduleId);
        // Recap mentoring nộp ở trang mentoring, không nộp qua module
        if (!module.isActive || module.code === RECAP_MODULE_CODE)
            throw ApiError.Conflict("error-learning-module-inactive");
        if (!(await this.targetsFn())(module, member))
            throw ApiError.Forbidden("error-learning-module-not-target");
        const fields = (await this.fieldModel.findAll({
            where: { moduleId, isActive: true },
            order: [["sortOrder", "ASC"]],
            raw: true,
        })) as ModuleField[];
        const normalized = await this.normalizeData(module, fields, input);
        const now = this.timeService.now();
        const id = await this.sequelize.transaction(async (t) => {
            let row: SubmissionModel;
            if (submissionId) {
                row = await this.submissionModel.findOne({
                    where: {
                        _id: submissionId,
                        memberId: member._id,
                        moduleId,
                    },
                    transaction: t,
                });
                if (!row) throw ApiError.NotFound("error-record-not-found");
                if (row.reviewStatus === SubmissionReviewStatus.APPROVED)
                    throw ApiError.Conflict("error-submission-reviewed");
                const period = await this.periodFlow.getById(row.periodId, t);
                this.periodFlow.assertWritable(period);
                const used = await this.countInCycle(
                    moduleId,
                    member._id,
                    row.cycleKey,
                    row._id,
                    t,
                );
                if (
                    row.reviewStatus === SubmissionReviewStatus.REJECTED &&
                    module.maxSubmissionsPerCycle &&
                    used >= module.maxSubmissionsPerCycle
                ) {
                    throw ApiError.Conflict("error-submission-limit", {
                        max: module.maxSubmissionsPerCycle,
                        cycle: row.cycleKey,
                    });
                }
                await row.update(
                    {
                        data: normalized.data,
                        libraryItemId: normalized.libraryItemId,
                        submittedAt: now,
                        status: SubmissionStatus.SUBMITTED,
                        reviewStatus: module.requireReview
                            ? SubmissionReviewStatus.PENDING
                            : SubmissionReviewStatus.NOT_REQUIRED,
                        reviewerId: null,
                        reviewedAt: null,
                        totalScore: null,
                    },
                    { transaction: t },
                );
                await this.scoreModel.destroy({
                    where: { submissionId: row._id },
                    transaction: t,
                });
            } else {
                const cycleKey = cycleKeyOf(module.cycleType, now);
                const used = await this.countInCycle(
                    moduleId,
                    member._id,
                    cycleKey,
                    undefined,
                    t,
                );
                if (
                    module.maxSubmissionsPerCycle &&
                    used >= module.maxSubmissionsPerCycle
                ) {
                    throw ApiError.Conflict("error-submission-limit", {
                        max: module.maxSubmissionsPerCycle,
                        cycle: cycleKey,
                    });
                }
                const { year, month } = vnParts(now);
                const period = await this.periodFlow.ensurePeriod(
                    year,
                    month,
                    t,
                );
                row = await this.submissionModel.create(
                    {
                        moduleId,
                        memberId: member._id,
                        periodId: period._id,
                        cycleKey,
                        data: normalized.data,
                        libraryItemId: normalized.libraryItemId,
                        status: SubmissionStatus.SUBMITTED,
                        submittedAt: now,
                        isLate: false,
                        reviewStatus: module.requireReview
                            ? SubmissionReviewStatus.PENDING
                            : SubmissionReviewStatus.NOT_REQUIRED,
                    },
                    { transaction: t },
                );
            }
            // Chặn trùng (vd link YouTube): giá trị đã dùng ở bài khác của module
            await this.uniqueModel.destroy({
                where: { submissionId: row._id },
                transaction: t,
            });
            for (const unique of normalized.uniques) {
                const taken = await this.uniqueModel.findOne({
                    where: {
                        moduleId,
                        fieldId: unique.field._id,
                        normalizedValue: unique.value,
                        submissionId: { [Op.ne]: row._id },
                    },
                    transaction: t,
                });
                if (taken)
                    throw ApiError.Conflict("error-submission-duplicate", {
                        label: unique.field.label,
                    });
                await this.uniqueModel.create(
                    {
                        moduleId,
                        fieldId: unique.field._id,
                        submissionId: row._id,
                        normalizedValue: unique.value,
                    },
                    { transaction: t },
                );
            }
            await this.attachments.removeAll(
                AttachmentOwnerType.SUBMISSION,
                row._id,
                t,
            );
            for (const file of normalized.files) {
                await this.attachments.replace(
                    AttachmentOwnerType.SUBMISSION,
                    row._id,
                    file.fileIds,
                    user,
                    t,
                    file.key,
                );
            }
            return row._id;
        });
        const [view] = await this.submissionViews([
            await this.submissionModel.findByPk(id, { raw: true }),
        ]);
        return view;
    }

    async removeSubmission(user: User, id: string) {
        const member = await this.memberOf(user);
        const row = await this.submissionModel.findOne({
            where: { _id: id, memberId: member._id },
            raw: true,
        });
        if (!row) throw ApiError.NotFound("error-record-not-found");
        if (row.reviewStatus === SubmissionReviewStatus.APPROVED)
            throw ApiError.Conflict("error-submission-reviewed");
        this.periodFlow.assertWritable(
            await this.periodFlow.getById(row.periodId),
        );
        await this.sequelize.transaction(async (t) => {
            await this.uniqueModel.destroy({
                where: { submissionId: id },
                transaction: t,
            });
            await this.scoreModel.destroy({
                where: { submissionId: id },
                transaction: t,
            });
            await this.attachments.removeAll(
                AttachmentOwnerType.SUBMISSION,
                id,
                t,
            );
            await this.submissionModel.destroy({
                where: { _id: id },
                transaction: t,
            });
        });
        return { deleted: true };
    }

    private async submissionViews(rows: Submission[]) {
        const ids = rows.map((row) => row._id);
        const files = await this.attachments.listFor(
            AttachmentOwnerType.SUBMISSION,
            ids,
        );
        const scores = ids.length
            ? await this.scoreModel.findAll({
                  where: { submissionId: ids },
                  raw: true,
              })
            : [];
        const libraryIds = [
            ...new Set(rows.map((row) => row.libraryItemId).filter(Boolean)),
        ];
        const library = new Map(
            (libraryIds.length
                ? await this.libraryModel.findAll({
                      where: { _id: libraryIds },
                      raw: true,
                  })
                : []
            ).map((item) => [item._id, item]),
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
            const item = library.get(row.libraryItemId);
            return {
                ...row,
                totalScore:
                    row.totalScore === null || row.totalScore === undefined
                        ? null
                        : Number(row.totalScore),
                files: files.get(row._id) ?? [],
                scores: scores
                    .filter((score) => score.submissionId === row._id)
                    .map((score) => ({ ...score, score: Number(score.score) })),
                libraryItem: item
                    ? { _id: item._id, title: item.title, author: item.author }
                    : null,
                member: member && {
                    _id: member._id,
                    memberCode: member.memberCode,
                    fullName: member.fullName,
                },
            };
        });
    }

    /** Module của tôi + tiến độ chu kỳ hiện tại + bài đã nộp */
    async getMine(user: User) {
        const member = await this.memberOf(user);
        const now = this.timeService.now();
        const targets = await this.targetsFn();
        const modules = (
            await this.moduleModel.findAll({
                where: { isActive: true },
                order: [
                    ["sortOrder", "ASC"],
                    ["code", "ASC"],
                ],
                raw: true,
            })
        ).filter(
            (module) =>
                module.code !== RECAP_MODULE_CODE && targets(module, member),
        );
        const details = await this.moduleDetails(modules);
        const submissions = await this.submissionModel.findAll({
            where: {
                memberId: member._id,
                moduleId: modules.map((module) => module._id),
            },
            order: [["submittedAt", "DESC"]],
            limit: 300,
            raw: true,
        });
        const views = await this.submissionViews(submissions);
        return {
            member: {
                _id: member._id,
                memberCode: member.memberCode,
                fullName: member.fullName,
                memberType: member.memberType,
            },
            modules: details.map((module) => {
                const cycleKey = cycleKeyOf(module.cycleType, now);
                const mine = views.filter((row) => row.moduleId === module._id);
                const counted = mine.filter(
                    (row) =>
                        row.cycleKey === cycleKey &&
                        row.reviewStatus !== SubmissionReviewStatus.REJECTED,
                );
                return {
                    ...module,
                    currentCycle: {
                        cycleKey,
                        submitted: counted.length,
                        min: module.minSubmissionsPerCycle ?? 0,
                        max: module.maxSubmissionsPerCycle ?? null,
                        canSubmit:
                            !module.maxSubmissionsPerCycle ||
                            counted.length < module.maxSubmissionsPerCycle,
                    },
                    submissions: mine,
                };
            }),
        };
    }

    // ------------------------------------------------------------------
    // Duyệt / chấm điểm
    // ------------------------------------------------------------------

    async listSubmissions(
        user: User,
        moduleId: string,
        query: {
            status?: string;
            cycleKey?: string;
            period?: string;
            memberId?: string;
        },
    ) {
        await this.assertCanManage(user, moduleId);
        const where: WhereOptions<Submission> = {
            moduleId,
            status: SubmissionStatus.SUBMITTED,
        };
        if (query.status)
            where.reviewStatus = query.status as SubmissionReviewStatus;
        if (query.cycleKey) where.cycleKey = query.cycleKey;
        if (query.memberId) where.memberId = query.memberId;
        if (query.period)
            where.periodId = (
                await this.periodFlow.getByCode(query.period)
            )._id;
        const rows = await this.submissionModel.findAll({
            where,
            order: [["submittedAt", "DESC"]],
            limit: 500,
            raw: true,
        });
        return this.submissionViews(rows);
    }

    /** Tiến độ cả nhóm trong 1 chu kỳ: ai chưa đủ số bài tối thiểu */
    async progress(user: User, moduleId: string, cycleKey?: string) {
        await this.assertCanManage(user, moduleId);
        const module = await this.getModule(moduleId);
        const key =
            cycleKey || cycleKeyOf(module.cycleType, this.timeService.now());
        const targets = await this.targetsFn();
        const members = (
            await this.memberModel.findAll({
                where: { status: { [Op.ne]: MemberStatus.INACTIVE } },
                order: [["memberCode", "ASC"]],
                raw: true,
            })
        ).filter((member) => targets(module, member));
        const rows = await this.submissionModel.findAll({
            where: {
                moduleId,
                cycleKey: key,
                status: SubmissionStatus.SUBMITTED,
            },
            raw: true,
        });
        const min = module.minSubmissionsPerCycle ?? 0;
        const list = members.map((member) => {
            const mine = rows.filter(
                (row) =>
                    row.memberId === member._id &&
                    row.reviewStatus !== SubmissionReviewStatus.REJECTED,
            );
            return {
                member: {
                    _id: member._id,
                    memberCode: member.memberCode,
                    fullName: member.fullName,
                },
                submitted: mine.length,
                approved: mine.filter(
                    (row) =>
                        row.reviewStatus === SubmissionReviewStatus.APPROVED,
                ).length,
                reached: mine.length >= min,
            };
        });
        return {
            cycleKey: key,
            min,
            max: module.maxSubmissionsPerCycle ?? null,
            totals: {
                members: list.length,
                reached: list.filter((row) => row.reached).length,
            },
            members: list,
        };
    }

    async review(user: User, id: string, dto: ReviewSubmissionDto) {
        const row = await this.submissionModel.findByPk(id, { raw: true });
        if (!row) throw ApiError.NotFound("error-record-not-found");
        await this.assertCanManage(user, row.moduleId);
        // Không tự duyệt / chấm bài của chính mình
        const self = await this.groupAccess.memberOfUser(user);
        if (self && self._id === row.memberId)
            throw ApiError.Forbidden("error-self-review");
        if (row.status !== SubmissionStatus.SUBMITTED)
            throw ApiError.Conflict("error-submission-not-submitted");
        this.periodFlow.assertWritable(
            await this.periodFlow.getById(row.periodId),
        );
        const [module] = await this.moduleDetails([
            await this.getModule(row.moduleId),
        ]);
        let totalScore: number | null = null;
        const approve = dto.status === "APPROVED";
        if (approve && module.enableScoring) {
            if (module.criteria.length) {
                const scores = dto.scores ?? [];
                for (const criterion of module.criteria) {
                    const score = scores.find(
                        (item) => item.criterionId === criterion._id,
                    );
                    if (
                        !score ||
                        score.score < 0 ||
                        score.score > criterion.maxScore
                    ) {
                        throw ApiError.BadRequest(
                            "error-submission-score-invalid",
                            { name: criterion.name, max: criterion.maxScore },
                        );
                    }
                }
                const got = module.criteria.reduce(
                    (sum, criterion) =>
                        sum +
                        scores.find(
                            (item) => item.criterionId === criterion._id,
                        ).score *
                            criterion.weight,
                    0,
                );
                const max = module.criteria.reduce(
                    (sum, criterion) =>
                        sum + criterion.maxScore * criterion.weight,
                    0,
                );
                totalScore = max
                    ? Math.round((got / max) * module.maxScore * 100) / 100
                    : 0;
            } else if (dto.totalScore !== undefined) {
                if (dto.totalScore > module.maxScore) {
                    throw ApiError.BadRequest(
                        "error-submission-score-invalid",
                        { name: module.name, max: module.maxScore },
                    );
                }
                totalScore = dto.totalScore;
            }
        }
        await this.sequelize.transaction(async (t) => {
            await this.scoreModel.destroy({
                where: { submissionId: id },
                transaction: t,
            });
            if (approve && module.enableScoring && module.criteria.length) {
                await this.scoreModel.bulkCreate(
                    (dto.scores ?? [])
                        .filter((score) =>
                            module.criteria.some(
                                (criterion) =>
                                    criterion._id === score.criterionId,
                            ),
                        )
                        .map((score) => ({
                            submissionId: id,
                            criterionId: score.criterionId,
                            score: score.score,
                            comment: score.comment ?? null,
                            scoredBy: user._id,
                        })),
                    { transaction: t },
                );
            }
            await this.submissionModel.update(
                {
                    reviewStatus: approve
                        ? SubmissionReviewStatus.APPROVED
                        : SubmissionReviewStatus.REJECTED,
                    reviewerId: user._id,
                    reviewedAt: this.timeService.now(),
                    feedback: dto.feedback?.trim() || null,
                    totalScore,
                },
                { where: { _id: id }, transaction: t },
            );
            // Bài bị từ chối: giải phóng giá trị chặn trùng để nộp lại
            if (!approve)
                await this.uniqueModel.destroy({
                    where: { submissionId: id },
                    transaction: t,
                });
        });
        const [view] = await this.submissionViews([
            await this.submissionModel.findByPk(id, { raw: true }),
        ]);
        return view;
    }

    /** Dùng cho dashboard */
    isMentee(member: Member) {
        return member.memberType === MemberType.MENTEE;
    }
}
