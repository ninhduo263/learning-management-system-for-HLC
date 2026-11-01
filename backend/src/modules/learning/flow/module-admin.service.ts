import { ApiError } from "@config/exception/api-error";
import { ActivityLogService } from "@module/activity-log/activity-log.service";
import { MemberModel } from "@module/member/models/member.model";
import { GroupAccessService } from "@module/organization/flow/group-access.service";
import { DepartmentModel } from "@module/organization/models/department.model";
import { MemberPositionModel } from "@module/organization/models/member-position.model";
import { PositionModel } from "@module/organization/models/position.model";
import { AdminScope } from "@module/permission/common/constant";
import { User } from "@module/user/entities/user.entity";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Op } from "sequelize";
import { LearningModuleModel } from "../models/learning-module.model";

/** Ban chứa chức vụ "Admin module ..." (Ban học tập) */
const ACADEMIC_DEPARTMENT_CODE = "BAN_HOC_TAP";

export const moduleAdminPositionCode = (moduleCode: string) =>
    `ADMIN_MODULE_${moduleCode}`;

const previousDay = (dateKey: string) =>
    new Date(Date.parse(`${dateKey}T00:00:00Z`) - 24 * 3600_000)
        .toISOString()
        .slice(0, 10);

export interface ModuleAdminView {
    _id: string;
    memberCode: string;
    fullName: string;
    memberType: string;
    startDate: string;
}

/**
 * Admin module học tập nhỏ: quản trị theo TÊN CHỨC VỤ (ví dụ "Admin module Đọc sách"), không còn quyền module
 * cấp riêng. Mỗi module có một chức vụ riêng (Position.moduleId); giữ chức vụ nào thì chỉ quản lý module đó.
 */
@Injectable()
export class ModuleAdminService {
    constructor(
        private readonly groupAccess: GroupAccessService,
        private readonly activityLog: ActivityLogService,
        @InjectModel(PositionModel)
        private readonly positionModel: typeof PositionModel,
        @InjectModel(MemberPositionModel)
        private readonly memberPositionModel: typeof MemberPositionModel,
        @InjectModel(DepartmentModel)
        private readonly departmentModel: typeof DepartmentModel,
        @InjectModel(MemberModel)
        private readonly memberModel: typeof MemberModel,
        @InjectModel(LearningModuleModel)
        private readonly moduleModel: typeof LearningModuleModel,
    ) {}

    private async findPosition(moduleId: string) {
        return this.positionModel.findOne({ where: { moduleId } });
    }

    private async ensurePosition(module: {
        _id: string;
        code: string;
        name: string;
    }) {
        const name = `Admin module ${module.name}`;
        const existing = await this.findPosition(module._id);
        if (existing) {
            if (existing.name !== name) await existing.update({ name });
            return existing;
        }
        return this.positionModel.create({
            code: moduleAdminPositionCode(module.code),
            name,
            groupKind: null,
            permissions: [],
            scopeKinds: [],
            allowancePoints: 0,
            bonusPoints: 0,
            adminScope: AdminScope.LEARNING_MODULE,
            moduleId: module._id,
            sortOrder: 30,
            description: `Quản lý riêng module ${module.name} (${module.code})`,
        });
    }

    /** Đổi tên module thì đổi tên chức vụ theo */
    async syncName(module: { _id: string; code: string; name: string }) {
        const position = await this.findPosition(module._id);
        if (position && position.name !== `Admin module ${module.name}`)
            await position.update({ name: `Admin module ${module.name}` });
    }

    /** moduleId -> người đang giữ chức vụ Admin module */
    async holdersByModule(moduleIds: string[]) {
        const result = new Map<string, ModuleAdminView[]>();
        if (!moduleIds.length) return result;
        const positions = await this.positionModel.findAll({
            where: { moduleId: moduleIds },
            raw: true,
        });
        if (!positions.length) return result;
        const today = this.groupAccess.today();
        const rows = await this.memberPositionModel.findAll({
            where: {
                positionId: positions.map((item) => item._id),
                startDate: { [Op.lte]: today },
                [Op.or]: [{ endDate: null }, { endDate: { [Op.gte]: today } }],
            },
            raw: true,
        });
        const members = new Map(
            (rows.length
                ? await this.memberModel.findAll({
                      where: {
                          _id: [...new Set(rows.map((row) => row.memberId))],
                      },
                      raw: true,
                  })
                : []
            ).map((item) => [item._id, item]),
        );
        for (const row of rows) {
            const moduleId = positions.find(
                (item) => item._id === row.positionId,
            )?.moduleId;
            const member = members.get(row.memberId);
            if (!moduleId || !member) continue;
            const list = result.get(moduleId) ?? [];
            if (!list.some((item) => item._id === member._id))
                list.push({
                    _id: member._id,
                    memberCode: member.memberCode,
                    fullName: member.fullName,
                    memberType: member.memberType,
                    startDate: row.startDate,
                });
            result.set(moduleId, list);
        }
        return result;
    }

    async list(moduleId: string) {
        return (await this.holdersByModule([moduleId])).get(moduleId) ?? [];
    }

    /** Đặt lại danh sách người giữ chức vụ Admin module: thêm người mới, kết thúc chức vụ của người bị bớt */
    async save(user: User, moduleId: string, memberIds: string[]) {
        const module = await this.moduleModel.findByPk(moduleId, { raw: true });
        if (!module) throw ApiError.NotFound("error-learning-module-not-found");
        const wanted = [...new Set(memberIds ?? [])];
        const found = wanted.length
            ? await this.memberModel.findAll({
                  where: { _id: wanted },
                  raw: true,
              })
            : [];
        if (found.length !== wanted.length)
            throw ApiError.NotFound("error-record-not-found");
        const department = await this.departmentModel.findOne({
            where: { code: ACADEMIC_DEPARTMENT_CODE },
            raw: true,
        });
        if (!department) throw ApiError.NotFound("error-record-not-found");
        const position = await this.ensurePosition(module);
        const before = await this.list(moduleId);
        const today = this.groupAccess.today();
        const current = await this.memberPositionModel.findAll({
            where: {
                positionId: position._id,
                [Op.or]: [{ endDate: null }, { endDate: { [Op.gte]: today } }],
            },
        });
        for (const row of current) {
            if (wanted.includes(row.memberId)) continue;
            // Giữ lịch sử: chức vụ vừa gán hôm nay thì xóa hẳn, còn lại kết thúc từ hôm qua
            if (row.startDate >= today) await row.destroy();
            else await row.update({ endDate: previousDay(today) });
        }
        for (const memberId of wanted) {
            if (current.some((row) => row.memberId === memberId)) continue;
            await this.memberPositionModel.create({
                memberId,
                departmentId: department._id,
                positionId: position._id,
                startDate: today,
                note: `Admin module ${module.name}`,
            });
        }
        const after = await this.list(moduleId);
        const names = (list: ModuleAdminView[]) =>
            list.map((item) => item.fullName).join(", ") || "—";
        const added = after.filter(
            (item) => !before.some((old) => old._id === item._id),
        );
        const removed = before.filter(
            (item) => !after.some((now) => now._id === item._id),
        );
        if (added.length || removed.length)
            await this.activityLog.log(user, {
                module: "LEARNING",
                action: "MODULE_ADMIN",
                targetId: moduleId,
                targetName: module.name,
                summary: `Admin module "${module.name}": thêm ${names(added)}; bớt ${names(removed)}`,
                detail: {
                    added: added.map((item) => item._id),
                    removed: removed.map((item) => item._id),
                },
            });
        return after;
    }
}
