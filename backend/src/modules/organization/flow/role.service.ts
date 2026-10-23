import { ApiError } from "@config/exception/api-error";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { GroupKind } from "../common/constant";
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
    ) {}

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
        return rows.map((row) => ({
            ...row,
            appliesTo: row.groupKind ?? "BAN",
            permissions: row.permissions ?? [],
            allowancePoints: Number(row.allowancePoints ?? 0),
            bonusPoints: Number(row.bonusPoints ?? 0),
            assignmentCount: Number(
                counts.find((item) => item.positionId === row._id)?.count ?? 0,
            ),
        }));
    }

    async save(dto: RoleDto, id?: string) {
        const values = {
            name: dto.name.trim(),
            groupKind: dto.appliesTo === "BAN" ? null : dto.appliesTo,
            // Quyền theo nhóm chỉ có nghĩa với vai trò thuộc nhóm; chấm recap chỉ cho nhóm MTE
            permissions:
                dto.appliesTo === "BAN"
                    ? []
                    : (dto.permissions ?? []).filter(
                          (item) =>
                              dto.appliesTo === GroupKind.MENTEE ||
                              item !== "SCORE_RECAP",
                      ),
            allowancePoints: dto.allowancePoints ?? 0,
            bonusPoints: dto.appliesTo === "BAN" ? 0 : (dto.bonusPoints ?? 0),
            adminScope: dto.adminScope || null,
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
