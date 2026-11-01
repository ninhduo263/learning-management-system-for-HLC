import { ActivityLogService } from "@module/activity-log/activity-log.service";
import { ApiError } from "@config/exception/api-error";
import { User } from "@module/user/entities/user.entity";
import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Op } from "sequelize";
import { MemberModel } from "../models/member.model";
import { ProvinceModel } from "../models/province.model";
import { normalizePlace, PROVINCES } from "./province-catalog";

/**
 * Danh mục tỉnh, thành phố dùng chung cho quê quán / địa chỉ. Khởi động: bổ sung danh mục còn thiếu và
 * quy đổi dữ liệu cũ nhập tự do về mã tỉnh; hồ sơ không khớp được đánh dấu để chọn lại.
 */
@Injectable()
export class ProvinceService implements OnApplicationBootstrap {
    private readonly logger = new Logger(ProvinceService.name);

    constructor(
        private readonly activityLog: ActivityLogService,
        @InjectModel(ProvinceModel)
        private readonly provinceModel: typeof ProvinceModel,
        @InjectModel(MemberModel)
        private readonly memberModel: typeof MemberModel,
    ) {}

    async onApplicationBootstrap() {
        try {
            let created = 0;
            for (const [index, item] of PROVINCES.entries()) {
                const [, isNew] = await this.provinceModel.findOrCreate({
                    where: { code: item.code },
                    defaults: { ...item, sortOrder: index + 1, isActive: true },
                });
                if (isNew) created += 1;
            }
            const converted = await this.convertLegacy();
            if (created || converted)
                this.logger.log(
                    `Danh mục tỉnh: thêm ${created}, quy đổi ${converted} hồ sơ`,
                );
        } catch (error) {
            this.logger.error(`Không khởi tạo được danh mục tỉnh: ${error}`);
        }
    }

    async list(includeInactive = false) {
        return this.provinceModel.findAll({
            where: includeInactive ? {} : { isActive: true },
            order: [
                ["sortOrder", "ASC"],
                ["name", "ASC"],
            ],
            raw: true,
        });
    }

    /** Tìm mã tỉnh trong chuỗi nhập tự do (ưu tiên tên xuất hiện cuối chuỗi, tên dài hơn) */
    async match(text?: string | null) {
        const value = ` ${normalizePlace(text ?? "")} `;
        if (!value.trim()) return null;
        const provinces = await this.list(true);
        let best: { code: string; index: number; length: number } | null = null;
        for (const province of provinces) {
            const target = province.mergedInto || province.code;
            for (const alias of [province.name, ...(province.aliases ?? [])]) {
                const key = normalizePlace(alias);
                if (!key) continue;
                const index = value.lastIndexOf(` ${key} `);
                if (index < 0) continue;
                if (
                    !best ||
                    index > best.index ||
                    (index === best.index && key.length > best.length)
                )
                    best = { code: target, index, length: key.length };
            }
        }
        return best?.code ?? null;
    }

    /** Mã tỉnh hợp lệ (đang dùng) hoặc lỗi; rỗng = bỏ chọn */
    async assertCode(code?: string | null) {
        if (!code) return null;
        const row = await this.provinceModel.findOne({
            where: { code, isActive: true },
            raw: true,
        });
        if (!row) throw ApiError.BadRequest("error-province-invalid");
        return row.code;
    }

    /** Quy đổi hồ sơ cũ (quê quán / địa chỉ nhập tự do, hoặc mã của tỉnh đã gộp) về mã danh mục */
    async convertLegacy() {
        let changed = 0;
        const merged = (await this.list(true)).filter(
            (item) => item.mergedInto,
        );
        for (const item of merged) {
            for (const field of ["hometownCode", "addressCode"] as const) {
                const [count] = await this.memberModel.update(
                    { [field]: item.mergedInto },
                    { where: { [field]: item.code } },
                );
                changed += count;
            }
        }
        const members = await this.memberModel.findAll({
            where: {
                [Op.or]: [
                    { hometownCode: null, hometown: { [Op.ne]: null } },
                    { addressCode: null, address: { [Op.ne]: null } },
                ],
            },
            raw: true,
        });
        for (const member of members) {
            const update: Record<string, string> = {};
            if (!member.hometownCode && member.hometown) {
                const code = await this.match(member.hometown);
                if (code) update.hometownCode = code;
            }
            if (!member.addressCode && member.address) {
                const code = await this.match(member.address);
                if (code) update.addressCode = code;
            }
            if (Object.keys(update).length) {
                await this.memberModel.update(update, {
                    where: { _id: member._id },
                });
                changed += 1;
            }
        }
        return changed;
    }

    /** Hồ sơ có quê quán / địa chỉ cũ nhưng chưa quy đổi được: cần thành viên hoặc Admin chọn lại */
    static needsReview(member: {
        hometown?: string | null;
        hometownCode?: string | null;
        address?: string | null;
        addressCode?: string | null;
    }) {
        return (
            (Boolean(member.hometown?.trim()) && !member.hometownCode) ||
            (Boolean(member.address?.trim()) && !member.addressCode)
        );
    }

    /**
     * Thêm / sửa đơn vị (đổi tên, thêm cách viết, gộp vào đơn vị khác, ngừng dùng). Hồ sơ lưu mã nên đổi
     * tên không ảnh hưởng dữ liệu; gộp thì hồ sơ của đơn vị cũ được chuyển sang mã mới.
     */
    async save(
        user: User,
        dto: {
            code: string;
            name: string;
            aliases?: string[];
            mergedInto?: string | null;
            isActive?: boolean;
            sortOrder?: number;
        },
    ) {
        if (dto.mergedInto) await this.assertCode(dto.mergedInto);
        const existing = await this.provinceModel.findOne({
            where: { code: dto.code },
        });
        const values = {
            name: dto.name.trim(),
            aliases: (dto.aliases ?? [])
                .map((item) => item.trim())
                .filter(Boolean),
            mergedInto: dto.mergedInto || null,
            isActive: dto.mergedInto ? false : (dto.isActive ?? true),
            ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        };
        if (existing) await existing.update(values);
        else
            await this.provinceModel.create({
                code: dto.code,
                ...values,
                sortOrder: dto.sortOrder ?? 100,
            });
        const converted = await this.convertLegacy();
        await this.activityLog.log(user, {
            module: "MEMBER",
            action: existing ? "PROVINCE_UPDATE" : "PROVINCE_CREATE",
            targetId: dto.code,
            targetName: values.name,
            summary: `${existing ? "Sửa" : "Thêm"} đơn vị hành chính ${values.name}${values.mergedInto ? ` (gộp vào ${values.mergedInto})` : ""}; quy đổi ${converted} hồ sơ`,
        });
        return this.provinceModel.findOne({
            where: { code: dto.code },
            raw: true,
        });
    }
}
