import { ActivityLogService } from "@module/activity-log/activity-log.service";
import { ApiError } from "@config/exception/api-error";
import { TargetMemberType } from "@module/member/common/constant";
import { MemberModel } from "@module/member/models/member.model";
import { DepartmentModel } from "@module/organization/models/department.model";
import { GroupMembershipModel } from "@module/organization/models/group-membership.model";
import { User } from "@module/user/entities/user.entity";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Transaction } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import { LearningModuleModel } from "../models/learning-module.model";
import { ModuleAudienceModel } from "../models/module-audience.model";

export const AUDIENCE_ALL = "ALL";
export const AUDIENCE_SELECTED = "SELECTED";

type ModuleLike = {
    _id: string;
    targetMemberType?: string | null;
    audienceMode?: string | null;
};
type MemberLike = { _id: string; memberType: string };

/**
 * Đối tượng của module học tập: đúng loại thành viên (Mentee / Mentor / Tất cả) và, nếu module chỉ
 * gán cho người cụ thể, thuộc danh sách người / nhóm được gán. Người không được gán không thấy module,
 * không nộp được và không bị tính thiếu bài.
 */
@Injectable()
export class ModuleAudienceService {
    constructor(
        private readonly sequelize: Sequelize,
        private readonly activityLog: ActivityLogService,
        @InjectModel(ModuleAudienceModel)
        private readonly audienceModel: typeof ModuleAudienceModel,
        @InjectModel(LearningModuleModel)
        private readonly moduleModel: typeof LearningModuleModel,
        @InjectModel(GroupMembershipModel)
        private readonly membershipModel: typeof GroupMembershipModel,
        @InjectModel(MemberModel)
        private readonly memberModel: typeof MemberModel,
        @InjectModel(DepartmentModel)
        private readonly departmentModel: typeof DepartmentModel,
    ) {}

    /** Hàm kiểm tra (module, thành viên) -> có phải đối tượng; nạp 1 lần dùng cho nhiều bản ghi */
    async resolver(t?: Transaction) {
        const rows = await this.audienceModel.findAll({
            raw: true,
            transaction: t,
        });
        const groupIds = [
            ...new Set(rows.map((row) => row.groupId).filter(Boolean)),
        ];
        const memberships = groupIds.length
            ? await this.membershipModel.findAll({
                  where: { groupId: groupIds, endDate: null },
                  raw: true,
                  transaction: t,
              })
            : [];
        const allowed = new Map<string, Set<string>>();
        for (const row of rows) {
            const set = allowed.get(row.moduleId) ?? new Set<string>();
            if (row.memberId) set.add(row.memberId);
            if (row.groupId)
                for (const item of memberships)
                    if (item.groupId === row.groupId) set.add(item.memberId);
            allowed.set(row.moduleId, set);
        }
        return (module: ModuleLike, member?: MemberLike | null) => {
            if (!member) return false;
            const target = module.targetMemberType ?? TargetMemberType.MENTEE;
            if (
                target !== TargetMemberType.ALL &&
                (target as string) !== member.memberType
            )
                return false;
            if ((module.audienceMode ?? AUDIENCE_ALL) !== AUDIENCE_SELECTED)
                return true;
            return allowed.get(module._id)?.has(member._id) ?? false;
        };
    }

    async get(moduleId: string) {
        const module = await this.moduleModel.findByPk(moduleId, { raw: true });
        if (!module) throw ApiError.NotFound("error-learning-module-not-found");
        const rows = await this.audienceModel.findAll({
            where: { moduleId },
            raw: true,
        });
        const memberIds = rows.map((row) => row.memberId).filter(Boolean);
        const groupIds = rows.map((row) => row.groupId).filter(Boolean);
        const [members, groups] = await Promise.all([
            memberIds.length
                ? this.memberModel.findAll({
                      where: { _id: memberIds },
                      raw: true,
                  })
                : [],
            groupIds.length
                ? this.departmentModel.findAll({
                      where: { _id: groupIds },
                      raw: true,
                  })
                : [],
        ]);
        const resolve = await this.resolver();
        const candidates = await this.memberModel.findAll({ raw: true });
        return {
            moduleId,
            mode: module.audienceMode ?? AUDIENCE_ALL,
            members: members.map((item) => ({
                _id: item._id,
                memberCode: item.memberCode,
                fullName: item.fullName,
                memberType: item.memberType,
            })),
            groups: groups.map((item) => ({
                _id: item._id,
                code: item.code,
                name: item.name,
                groupKind: item.groupKind,
            })),
            /** Số người đang là đối tượng của module */
            audienceCount: candidates.filter((item) => resolve(module, item))
                .length,
        };
    }

    /** Thêm / bớt người được gán bất cứ lúc nào; bài đã nộp trước đó giữ nguyên */
    async save(
        user: User,
        moduleId: string,
        dto: { mode: string; memberIds?: string[]; groupIds?: string[] },
    ) {
        const module = await this.moduleModel.findByPk(moduleId, { raw: true });
        if (!module) throw ApiError.NotFound("error-learning-module-not-found");
        const mode =
            dto.mode === AUDIENCE_SELECTED ? AUDIENCE_SELECTED : AUDIENCE_ALL;
        const memberIds = [...new Set(dto.memberIds ?? [])];
        const groupIds = [...new Set(dto.groupIds ?? [])];
        if (mode === AUDIENCE_SELECTED && !memberIds.length && !groupIds.length)
            throw ApiError.BadRequest("error-module-audience-empty");
        const before = await this.get(moduleId);
        await this.sequelize.transaction(async (t) => {
            await this.moduleModel.update(
                { audienceMode: mode },
                { where: { _id: moduleId }, transaction: t },
            );
            await this.audienceModel.destroy({
                where: { moduleId },
                transaction: t,
            });
            if (mode === AUDIENCE_SELECTED)
                await this.audienceModel.bulkCreate(
                    [
                        ...memberIds.map((memberId) => ({
                            moduleId,
                            memberId,
                            addedBy: user._id,
                        })),
                        ...groupIds.map((groupId) => ({
                            moduleId,
                            groupId,
                            addedBy: user._id,
                        })),
                    ],
                    { transaction: t },
                );
        });
        const after = await this.get(moduleId);
        const names = (list: { fullName?: string; name?: string }[]) =>
            list.map((item) => item.fullName ?? item.name).join(", ") || "—";
        const oldIds = new Set([
            ...before.members.map((item) => item._id),
            ...before.groups.map((item) => item._id),
        ]);
        const newIds = new Set([
            ...after.members.map((item) => item._id),
            ...after.groups.map((item) => item._id),
        ]);
        const added = [...after.members, ...after.groups].filter(
            (item) => !oldIds.has(item._id),
        );
        const removed = [...before.members, ...before.groups].filter(
            (item) => !newIds.has(item._id),
        );
        await this.activityLog.log(user, {
            module: "LEARNING",
            action: "MODULE_AUDIENCE",
            targetId: moduleId,
            targetName: module.name,
            summary:
                mode === AUDIENCE_ALL
                    ? `Module "${module.name}" áp dụng cho mọi thành viên đúng đối tượng`
                    : `Gán module "${module.name}": thêm ${names(added)}; bớt ${names(removed)} (${after.audienceCount} người đang được gán)`,
            detail: {
                mode,
                added: added.map((item) => item._id),
                removed: removed.map((item) => item._id),
            },
        });
        return after;
    }
}
