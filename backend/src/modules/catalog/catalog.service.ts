import { ActivityLogService } from "@module/activity-log/activity-log.service";
import { ApiError } from "@config/exception/api-error";
import { MemberModel } from "@module/member/models/member.model";
import { normalizePlace } from "@module/member/services/province-catalog";
import { User } from "@module/user/entities/user.entity";
import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Op } from "sequelize";
import { BANKS, CAREERS } from "./catalog-data";
import { CatalogItemModel } from "./catalog-item.model";

export const CATALOG_TYPES = ["CAREER", "BANK"] as const;
export type CatalogType = (typeof CATALOG_TYPES)[number];
const LABEL: Record<CatalogType, string> = {
    CAREER: "nhóm ngành nghề",
    BANK: "ngân hàng",
};

/**
 * Danh mục dùng chung: 38 nhóm ngành nghề (ngành học, ngành nghề - chọn nhiều) và ngân hàng nhận chuyển khoản từ
 * MB Bank. Khởi động: bổ sung mục còn thiếu, quy đổi dữ liệu cũ nhập tự do về mã danh mục.
 */
@Injectable()
export class CatalogService implements OnApplicationBootstrap {
    private readonly logger = new Logger(CatalogService.name);

    constructor(
        private readonly activityLog: ActivityLogService,
        @InjectModel(CatalogItemModel)
        private readonly itemModel: typeof CatalogItemModel,
        @InjectModel(MemberModel)
        private readonly memberModel: typeof MemberModel,
    ) {}

    async onApplicationBootstrap() {
        try {
            let created = 0;
            const seed: [
                CatalogType,
                {
                    code: string;
                    name: string;
                    shortName?: string;
                    aliases?: string[];
                }[],
            ][] = [
                ["CAREER", CAREERS],
                ["BANK", BANKS],
            ];
            for (const [type, rows] of seed)
                for (const [index, row] of rows.entries()) {
                    const [, isNew] = await this.itemModel.findOrCreate({
                        where: { type, code: row.code },
                        defaults: {
                            type,
                            code: row.code,
                            name: row.name,
                            shortName: row.shortName ?? null,
                            aliases: row.aliases ?? [],
                            sortOrder: index + 1,
                            isActive: true,
                        },
                    });
                    if (isNew) created += 1;
                }
            const converted = await this.convertLegacy();
            if (created || converted)
                this.logger.log(
                    `Danh mục: thêm ${created} mục, quy đổi ${converted} hồ sơ`,
                );
        } catch (error) {
            this.logger.error(`Không khởi tạo được danh mục: ${error}`);
        }
    }

    private assertType(type: string): CatalogType {
        if (!(CATALOG_TYPES as readonly string[]).includes(type))
            throw ApiError.NotFound("error-record-not-found");
        return type as CatalogType;
    }

    async list(type: string, includeInactive = false) {
        const rows = await this.itemModel.findAll({
            where: {
                type: this.assertType(type),
                ...(!includeInactive && { isActive: true }),
            },
            order: [
                ["sortOrder", "ASC"],
                ["name", "ASC"],
            ],
            raw: true,
        });
        return rows;
    }

    /** Mã hợp lệ (đang dùng); mã của mục đã gộp quy về mục mới */
    async resolve(type: CatalogType, codes: string[]) {
        if (!codes.length) return [];
        const rows = await this.itemModel.findAll({
            where: { type, code: codes },
            raw: true,
        });
        const result: string[] = [];
        for (const code of codes) {
            const row = rows.find((item) => item.code === code);
            if (!row)
                throw ApiError.BadRequest("error-catalog-invalid", {
                    type: LABEL[type],
                });
            const target = row.mergedInto || row.code;
            if (!row.mergedInto && !row.isActive)
                throw ApiError.BadRequest("error-catalog-invalid", {
                    type: LABEL[type],
                });
            if (!result.includes(target)) result.push(target);
        }
        return result;
    }

    /** Ngân hàng hợp lệ: { code, display } (display lưu kèm trong hồ sơ cho file cũ) */
    async bank(code?: string | null) {
        if (!code) return null;
        const [resolved] = await this.resolve("BANK", [code]);
        const row = await this.itemModel.findOne({
            where: { type: "BANK", code: resolved },
            raw: true,
        });
        return { code: row.code, display: row.shortName || row.name };
    }

    /** Tìm các mục khớp chuỗi nhập tự do (theo tên từng phần "/" và cách viết khác) */
    async match(type: CatalogType, text?: string | null) {
        const value = ` ${normalizePlace(text ?? "")} `;
        if (!value.trim()) return [];
        const rows = await this.itemModel.findAll({
            where: { type },
            raw: true,
        });
        const found: string[] = [];
        for (const row of rows) {
            const keys = [
                ...row.name.split("/"),
                row.shortName ?? "",
                ...(row.aliases ?? []),
            ]
                .map((item) => normalizePlace(item))
                .filter((item) => item.length >= 2);
            if (keys.some((key) => value.includes(` ${key} `))) {
                const target = row.mergedInto || row.code;
                if (!found.includes(target)) found.push(target);
            }
        }
        return found;
    }

    /** Quy đổi ngành học / ngành nghề / ngân hàng nhập tự do (và mã của mục đã gộp) về mã danh mục */
    async convertLegacy() {
        let changed = 0;
        const merged = await this.itemModel.findAll({
            where: { mergedInto: { [Op.ne]: null } },
            raw: true,
        });
        for (const item of merged.filter((row) => row.type === "BANK")) {
            const [count] = await this.memberModel.update(
                { bankCode: item.mergedInto },
                { where: { bankCode: item.code } },
            );
            changed += count;
        }
        const members = await this.memberModel.findAll({ raw: true });
        const mergedCareer = new Map(
            merged
                .filter((row) => row.type === "CAREER")
                .map((row) => [row.code, row.mergedInto]),
        );
        for (const member of members) {
            const update: Record<string, unknown> = {};
            const remap = (codes?: string[] | null) =>
                codes?.length
                    ? [
                          ...new Set(
                              codes.map(
                                  (code) => mergedCareer.get(code) ?? code,
                              ),
                          ),
                      ]
                    : codes;
            if (!member.majorCodes?.length && member.major) {
                const codes = await this.match("CAREER", member.major);
                if (codes.length) update.majorCodes = codes;
            } else if (
                member.majorCodes?.some((code) => mergedCareer.has(code))
            )
                update.majorCodes = remap(member.majorCodes);
            if (!member.occupationCodes?.length && member.occupation) {
                const codes = await this.match("CAREER", member.occupation);
                if (codes.length) update.occupationCodes = codes;
            } else if (
                member.occupationCodes?.some((code) => mergedCareer.has(code))
            )
                update.occupationCodes = remap(member.occupationCodes);
            if (!member.bankCode && member.bankName) {
                const [code] = await this.match("BANK", member.bankName);
                if (code) update.bankCode = code;
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

    /** Hồ sơ còn dữ liệu cũ chưa quy đổi được (cần thành viên / Admin chọn lại) */
    static needsReview(member: {
        major?: string | null;
        majorCodes?: string[] | null;
        occupation?: string | null;
        occupationCodes?: string[] | null;
        bankName?: string | null;
        bankCode?: string | null;
    }) {
        return {
            major: Boolean(member.major?.trim()) && !member.majorCodes?.length,
            occupation:
                Boolean(member.occupation?.trim()) &&
                !member.occupationCodes?.length,
            bank: Boolean(member.bankName?.trim()) && !member.bankCode,
        };
    }

    async save(
        user: User,
        type: string,
        dto: {
            code: string;
            name: string;
            shortName?: string | null;
            aliases?: string[];
            mergedInto?: string | null;
            isActive?: boolean;
            sortOrder?: number;
        },
    ) {
        const kind = this.assertType(type);
        if (dto.mergedInto) await this.resolve(kind, [dto.mergedInto]);
        const existing = await this.itemModel.findOne({
            where: { type: kind, code: dto.code },
        });
        const values = {
            name: dto.name.trim(),
            shortName: dto.shortName?.trim() || null,
            aliases: (dto.aliases ?? [])
                .map((item) => item.trim())
                .filter(Boolean),
            mergedInto: dto.mergedInto || null,
            isActive: dto.mergedInto ? false : (dto.isActive ?? true),
            ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        };
        if (existing) await existing.update(values);
        else
            await this.itemModel.create({
                type: kind,
                code: dto.code,
                ...values,
                sortOrder: dto.sortOrder ?? 100,
            });
        const converted = await this.convertLegacy();
        await this.activityLog.log(user, {
            module: "MEMBER",
            action: existing ? "CATALOG_UPDATE" : "CATALOG_CREATE",
            targetId: `${kind}:${dto.code}`,
            targetName: values.name,
            summary: `${existing ? "Sửa" : "Thêm"} ${LABEL[kind]} "${values.name}"${values.mergedInto ? ` (gộp vào ${values.mergedInto})` : ""}${!values.isActive && !values.mergedInto ? " (ẩn)" : ""}; quy đổi ${converted} hồ sơ`,
        });
        return this.itemModel.findOne({
            where: { type: kind, code: dto.code },
            raw: true,
        });
    }
}
