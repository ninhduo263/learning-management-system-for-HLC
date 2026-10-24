import { ApiError } from "@config/exception/api-error";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { ActivityLogService } from "@module/activity-log/activity-log.service";
import { User } from "@module/user/entities/user.entity";
import { Op } from "sequelize";
import {
    GLOBAL_PERMISSIONS,
    GROUP_PERMISSIONS,
    GroupKind,
} from "../common/constant";
import { KIND_ROLE_CODES } from "./group-access.service";
import { GroupKindConfigModel } from "../models/group-kind-config.model";
import { MemberPositionModel } from "../models/member-position.model";
import { PositionModel } from "../models/position.model";
import { RoleDto } from "./dto/role.dto";

const DEFAULT_THRESHOLD = 90;

/** Danh mục vai trò: quyền hạn + điểm phụ cấp + điểm thưởng; ngưỡng % theo loại nhóm */
@Injectable()
export class RoleService {
    constructor(
        @InjectModel(PositionModel)
        private readonly positionModel: typeof PositionModel,
        @InjectModel(MemberPositionModel)
        private readonly memberPositionModel: typeof MemberPositionModel,
        @InjectModel(GroupKindConfigModel)
        private readonly configModel: typeof GroupKindConfigModel,
        private readonly activityLog: ActivityLogService,
    ) {}

    /** Số người đang giữ vai trò (hôm nay còn hiệu lực) */
    private async activeHolders(positionId: string) {
        const today = new Date(Date.now() + 7 * 3600_000)
            .toISOString()
            .slice(0, 10);
        return this.memberPositionModel.count({
            where: {
                positionId,
                [Op.or]: [{ endDate: null }, { endDate: { [Op.gte]: today } }],
            },
        });
    }

    async list() {
        const rows = await this.positionModel.findAll({
            order: [
                ["sortOrder", "ASC"],
                ["code", "ASC"],
            ],
            raw: true,
        });
        const counts = (await this.memberPositionModel.count({
            group: ["positionId"],
        })) as unknown as { positionId: string; count: number }[];
        const active = (await this.memberPositionModel.count({
            where: {
                [Op.or]: [
                    { endDate: null },
                    {
                        endDate: {
                            [Op.gte]: new Date(Date.now() + 7 * 3600_000)
                                .toISOString()
                                .slice(0, 10),
                        },
                    },
                ],
            },
            group: ["positionId"],
        })) as unknown as { positionId: string; count: number }[];
        const systemCodes = Object.values(KIND_ROLE_CODES).flatMap((item) => [
            item.leader,
            item.deputy,
        ]);
        return rows.map((row) => ({
            ...row,
            appliesTo: row.groupKind ?? "BAN",
            permissions: row.permissions ?? [],
            scopeKinds: row.scopeKinds ?? [],
            activeHolderCount: Number(
                active.find((item) => item.positionId === row._id)?.count ?? 0,
            ),
            /** Vai trò Leader / Phó nhóm mặc định: không xóa được */
            isSystem: systemCodes.includes(row.code),
            allowancePoints: Number(row.allowancePoints ?? 0),
            bonusPoints: Number(row.bonusPoints ?? 0),
            assignmentCount: Number(
                counts.find((item) => item.positionId === row._id)?.count ?? 0,
            ),
        }));
    }

    async save(dto: RoleDto, id?: string) {
        const isBan = dto.appliesTo === "BAN";
        const values = {
            name: dto.name.trim(),
            groupKind: isBan ? null : dto.appliesTo,
            // Vai trò trong nhóm: quyền theo nhóm (chấm recap chỉ cho nhóm MTE).
            // Vai trò cấp ban: quyền cấp hệ thống + quyền theo nhóm áp dụng cho mọi nhóm thuộc scopeKinds
            permissions: (dto.permissions ?? []).filter((item) =>
                isBan
                    ? GLOBAL_PERMISSIONS.includes(item) ||
                      (GROUP_PERMISSIONS.includes(item) &&
                          Boolean(dto.scopeKinds?.length))
                    : GROUP_PERMISSIONS.includes(item) &&
                      (dto.appliesTo === GroupKind.MENTEE ||
                          item !== "SCORE_RECAP"),
            ),
            scopeKinds: isBan ? (dto.scopeKinds ?? []) : [],
            allowancePoints: dto.allowancePoints ?? 0,
            bonusPoints: isBan ? 0 : (dto.bonusPoints ?? 0),
            adminScope: isBan ? dto.adminScope || null : null,
            description: dto.description?.trim() || null,
            ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
            ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        };
        if (id) {
            const row = await this.positionModel.findByPk(id);
            if (!row) throw ApiError.NotFound("error-record-not-found");
            // Đã có người giữ thì không đổi loại nhóm (tránh vai trò lệch loại)
            if (
                (row.groupKind ?? null) !== values.groupKind &&
                (await this.memberPositionModel.count({
                    where: { positionId: id },
                }))
            ) {
                throw ApiError.BadRequest("error-role-kind-mismatch", {
                    role: row.name,
                });
            }
            await row.update(values);
            return row.get({ plain: true });
        }
        if (!dto.code) throw ApiError.BadRequest("error-validation-failed");
        return (
            await this.positionModel.create({ code: dto.code, ...values })
        ).get({ plain: true });
    }

    /**
     * Xóa vai trò (chỉ Admin toàn cục). Đang có người giữ thì không xóa được. Đã từng gán (có lịch sử
     * tính phụ cấp) thì chỉ ngừng dùng để giữ lịch sử; chưa từng gán thì xóa hẳn. Có nhật ký.
     */
    async remove(id: string, user: User) {
        const row = await this.positionModel.findByPk(id);
        if (!row) throw ApiError.NotFound("error-record-not-found");
        const systemCodes = Object.values(KIND_ROLE_CODES).flatMap((item) => [
            item.leader,
            item.deputy,
        ]);
        if (systemCodes.includes(row.code))
            throw ApiError.BadRequest("error-role-system", { role: row.name });
        const holders = await this.activeHolders(id);
        if (holders)
            throw ApiError.BadRequest("error-role-in-use", {
                role: row.name,
                count: holders,
            });
        const history = await this.memberPositionModel.count({
            where: { positionId: id },
        });
        if (history) await row.update({ isActive: false });
        else await row.destroy();
        await this.activityLog.log(user, {
            module: "ROLE",
            action: history ? "ROLE_DEACTIVATE" : "ROLE_DELETE",
            targetId: id,
            targetName: row.name,
            summary: history
                ? `Ngừng dùng vai trò ${row.name} (đã có ${history} lần gán trước đây, giữ lịch sử phụ cấp)`
                : `Xóa vai trò ${row.name}`,
        });
        return { mode: history ? "DEACTIVATE" : "DELETE" };
    }

    async thresholds() {
        const rows = await this.configModel.findAll({ raw: true });
        return Object.fromEntries(
            Object.values(GroupKind).map((kind) => [
                kind,
                Number(
                    rows.find((row) => row.groupKind === kind)
                        ?.completionThreshold ?? DEFAULT_THRESHOLD,
                ),
            ]),
        ) as Record<GroupKind, number>;
    }

    async saveThresholds(values: Record<GroupKind, number>) {
        for (const kind of Object.values(GroupKind)) {
            const [row] = await this.configModel.findOrCreate({
                where: { groupKind: kind },
                defaults: {
                    groupKind: kind,
                    completionThreshold: values[kind],
                },
            });
            await row.update({ completionThreshold: values[kind] });
        }
        return this.thresholds();
    }
}
