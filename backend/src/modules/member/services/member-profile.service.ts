import { ApiError } from "@config/exception/api-error";
import { User } from "@module/user/entities/user.entity";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Transaction } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import { Member } from "../entities/member.entity";
import { MemberProfileLogModel } from "../models/member-profile-log.model";
import { MemberModel } from "../models/member.model";
import { SecurityConfigService } from "@module/setting/security-config.service";
import { ProvinceService } from "./province.service";
import { UserModel } from "@module/repository/sequelize/model/user.model";
import { ActivityLogService } from "@module/activity-log/activity-log.service";
import { CatalogService } from "@module/catalog/catalog.service";
import { ProfileChangeRequestModel } from "../models/profile-change-request.model";
import { ProfileDraftModel } from "../models/profile-draft.model";
import { BankHistoryService } from "./bank-history.service";

export const PROFILE_FIELD_NAME: Record<string, string> = {
    bankAccount: "số tài khoản",
    bankCode: "ngân hàng",
    bankName: "tên ngân hàng",
    nationalId: "số CCCD",
};

/** Trường được ghi lịch sử khi thay đổi */
export const TRACKED_FIELDS = [
    "fullName",
    "memberType",
    "status",
    "dateOfBirth",
    "gender",
    "phone",
    "hidePhone",
    "email",
    "address",
    "hometown",
    "hometownCode",
    "addressCode",
    "major",
    "occupation",
    "majorCodes",
    "occupationCodes",
    "profileUrl",
    "bankAccount",
    "bankCode",
    "bankName",
    "nationalId",
    "joinedAt",
] as const;
/** Thay đổi nhạy cảm phải được duyệt trước khi thành chính thức (thành viên tự sửa) */
export const APPROVAL_FIELDS = ["bankAccount", "bankCode", "nationalId"];
/**
 * Thành viên tự sửa. Quê quán / địa chỉ chọn từ danh mục tỉnh (hometownCode / addressCode), không nhập tự do.
 * Link profile tạm thời chỉ Admin sửa (mở lại bằng công tắc "memberCanEditProfileUrl").
 */
export const SELF_EDITABLE = [
    "dateOfBirth",
    "gender",
    "phone",
    "hidePhone",
    "email",
    "hometownCode",
    "addressCode",
    "majorCodes",
    "occupationCodes",
    "bankAccount",
    "bankCode",
    "nationalId",
];
export const ADMIN_EDITABLE = [
    ...SELF_EDITABLE,
    "profileUrl",
    "address",
    "hometown",
    "fullName",
    "memberType",
    "status",
    "joinedAt",
    "note",
];
/** Không trả cho người khác ngoài chính chủ và Admin */
export const SENSITIVE_FIELDS = [
    "bankAccount",
    "bankName",
    "address",
    "dateOfBirth",
    "hometown",
    "hometownCode",
    "addressCode",
    "nationalId",
];

const normalize = (value: unknown) =>
    value === undefined || value === null || value === ""
        ? null
        : Array.isArray(value)
          ? value.length
              ? [...value].map(String).sort().join(", ")
              : null
          : String(value).trim() || null;

@Injectable()
export class MemberProfileService {
    constructor(
        private readonly sequelize: Sequelize,
        @InjectModel(MemberModel)
        private readonly memberModel: typeof MemberModel,
        @InjectModel(MemberProfileLogModel)
        private readonly logModel: typeof MemberProfileLogModel,
        private readonly provinces: ProvinceService,
        @InjectModel(UserModel)
        private readonly userModel: typeof UserModel,
        private readonly securityConfig: SecurityConfigService,
        private readonly catalogs: CatalogService,
        private readonly bankHistory: BankHistoryService,
        private readonly activityLog: ActivityLogService,
        @InjectModel(ProfileDraftModel)
        private readonly draftModel: typeof ProfileDraftModel,
        @InjectModel(ProfileChangeRequestModel)
        private readonly requestModel: typeof ProfileChangeRequestModel,
    ) {}

    private async ownMember(user: User) {
        const member = await this.memberModel.findOne({
            where: { userId: user._id },
            raw: true,
        });
        if (!member) throw ApiError.NotFound("error-member-not-linked");
        return member;
    }

    /** Ghi lịch sử các trường thay đổi giữa bản cũ và giá trị mới */
    async logChanges(
        before: Partial<Member>,
        update: Record<string, unknown>,
        user: Pick<User, "_id">,
        role: "SELF" | "ADMIN" | "APPROVED",
        t?: Transaction,
    ) {
        const rows = TRACKED_FIELDS.filter(
            (field) =>
                field in update &&
                normalize(update[field]) !== normalize(before[field]),
        ).map((field) => ({
            memberId: before._id,
            field,
            oldValue: normalize(before[field]),
            newValue: normalize(update[field]),
            changedBy: user._id,
            changedByRole: role,
        }));
        if (rows.length)
            await this.logModel.bulkCreate(rows, { transaction: t });
        return rows.length;
    }

    private pick(dto: Record<string, unknown>, allowed: string[]) {
        return Object.fromEntries(
            Object.entries(dto)
                .filter(
                    ([key, value]) =>
                        allowed.includes(key) && value !== undefined,
                )
                .map(([key, value]) => [
                    key,
                    typeof value === "string" ? value.trim() || null : value,
                ]),
        );
    }

    async getOwn(user: User) {
        return this.ownMember(user);
    }

    /** Áp dụng thay đổi vào bản chính thức (ghi lịch sử; đổi ngân hàng ghi kỳ bắt đầu áp dụng) */
    async applyOfficial(
        member: Member,
        update: Record<string, unknown>,
        user: Pick<User, "_id">,
        role: "SELF" | "ADMIN" | "APPROVED",
        options: { requestId?: string; t?: Transaction } = {},
    ) {
        const run = async (t: Transaction) => {
            await this.logChanges(member, update, user, role, t);
            const bankChanged = ["bankAccount", "bankCode"].some(
                (field) =>
                    field in update &&
                    normalize(update[field]) !== normalize(member[field]),
            );
            let effective: string | null = null;
            if (bankChanged)
                effective = await this.bankHistory.record(
                    member._id,
                    {
                        bankAccount: member.bankAccount ?? null,
                        bankCode: member.bankCode ?? null,
                        bankName: member.bankName ?? null,
                    },
                    {
                        bankAccount: ("bankAccount" in update
                            ? update.bankAccount
                            : member.bankAccount) as string | null,
                        bankCode: ("bankCode" in update
                            ? update.bankCode
                            : member.bankCode) as string | null,
                        bankName: ("bankName" in update
                            ? update.bankName
                            : member.bankName) as string | null,
                    },
                    role === "ADMIN" ? "ADMIN" : "APPROVAL",
                    { userId: user._id, requestId: options.requestId, t },
                );
            await this.memberModel.update(update, {
                where: { _id: member._id },
                transaction: t,
            });
            return effective;
        };
        return options.t
            ? run(options.t)
            : this.sequelize.transaction((t) => run(t));
    }

    /** Kiểm tra mã tỉnh, nhóm ngành, ngân hàng trong danh mục; tên ngân hàng lấy theo danh mục */
    private async normalizeInput(update: Record<string, unknown>) {
        for (const field of ["hometownCode", "addressCode"])
            if (field in update)
                update[field] = await this.provinces.assertCode(
                    update[field] as string,
                );
        for (const field of ["majorCodes", "occupationCodes"])
            if (field in update)
                update[field] = await this.catalogs.resolve(
                    "CAREER",
                    Array.isArray(update[field])
                        ? (update[field] as string[])
                        : [],
                );
        if ("bankCode" in update) {
            const bank = await this.catalogs.bank(update.bankCode as string);
            update.bankCode = bank?.code ?? null;
            update.bankName = bank?.display ?? null;
        }
        return update;
    }

    private async assertNationalIdFree(memberId: string, nationalId?: unknown) {
        if (!nationalId) return;
        const other = await this.memberModel.findOne({
            where: { nationalId: nationalId as string },
            raw: true,
        });
        if (other && other._id !== memberId)
            throw ApiError.Conflict("error-national-id-duplicate", {
                code: other.memberCode,
                name: other.fullName,
            });
    }

    // ------------------------------------------------------------------
    // Bản nháp (chỉ chính chủ thấy, không tác động trang khác)
    // ------------------------------------------------------------------

    async getDraft(user: User) {
        const member = await this.ownMember(user);
        return this.draftModel.findOne({
            where: { memberId: member._id },
            raw: true,
        });
    }

    async saveDraft(user: User, data: Record<string, unknown>) {
        const member = await this.ownMember(user);
        const clean = this.pick(data ?? {}, SELF_EDITABLE);
        const [row] = await this.draftModel.findOrCreate({
            where: { memberId: member._id },
            defaults: { memberId: member._id, data: clean },
        });
        await row.update({ data: clean });
        return row.get({ plain: true });
    }

    async discardDraft(user: User) {
        const member = await this.ownMember(user);
        await this.draftModel.destroy({ where: { memberId: member._id } });
        return { discarded: true };
    }

    /**
     * Nhấn Lưu: thay đổi không nhạy cảm thành chính thức ngay; thay đổi nhạy cảm (số tài khoản, ngân hàng, CCCD)
     * tạo yêu cầu chờ duyệt (thay yêu cầu đang chờ trước đó). Bản nháp được xóa.
     */
    async updateOwn(user: User, dto: Record<string, unknown>) {
        const member = await this.ownMember(user);
        const { memberCanEditProfileUrl } = await this.securityConfig.get();
        const allowed = memberCanEditProfileUrl
            ? [...SELF_EDITABLE, "profileUrl"]
            : SELF_EDITABLE;
        if (
            !memberCanEditProfileUrl &&
            dto.profileUrl !== undefined &&
            normalize(dto.profileUrl) !== normalize(member.profileUrl)
        )
            throw ApiError.Forbidden("error-profile-url-admin-only");
        const update = await this.normalizeInput(this.pick(dto, allowed));
        const changed = Object.keys(update).filter(
            (field) =>
                field !== "bankName" &&
                normalize(update[field]) !== normalize(member[field]),
        );
        const sensitive = changed.filter((field) =>
            APPROVAL_FIELDS.includes(field),
        );
        const official = Object.fromEntries(
            changed
                .filter((field) => !APPROVAL_FIELDS.includes(field))
                .map((field) => [field, update[field]]),
        );
        if (sensitive.includes("nationalId"))
            await this.assertNationalIdFree(member._id, update.nationalId);
        let request: ProfileChangeRequestModel | null = null;
        await this.sequelize.transaction(async (t) => {
            if (Object.keys(official).length)
                await this.applyOfficial(member, official, user, "SELF", { t });
            if (sensitive.length) {
                await this.requestModel.update(
                    {
                        status: "CANCELLED",
                        reason: "Thay bằng yêu cầu mới",
                        decidedAt: new Date(),
                    },
                    {
                        where: { memberId: member._id, status: "PENDING" },
                        transaction: t,
                    },
                );
                const changes = sensitive.map((field) => ({
                    field,
                    oldValue: normalize(member[field]),
                    newValue: normalize(update[field]),
                }));
                if (sensitive.includes("bankCode"))
                    changes.push({
                        field: "bankName",
                        oldValue: normalize(member.bankName),
                        newValue: normalize(update.bankName),
                    });
                request = await this.requestModel.create(
                    {
                        memberId: member._id,
                        changes,
                        status: "PENDING",
                        requestedBy: user._id,
                    },
                    { transaction: t },
                );
            }
            await this.draftModel.destroy({
                where: { memberId: member._id },
                transaction: t,
            });
        });
        if (request)
            await this.activityLog.log(user, {
                module: "MEMBER",
                action: "PROFILE_CHANGE_REQUEST",
                targetId: member._id,
                targetName: `${member.memberCode} - ${member.fullName}`,
                summary: `${member.fullName} gửi thay đổi ${sensitive.map((field) => PROFILE_FIELD_NAME[field] ?? field).join(", ")} chờ duyệt`,
            });
        return {
            member: await this.memberModel.findByPk(member._id, { raw: true }),
            applied: Object.keys(official),
            pending: request
                ? (request as ProfileChangeRequestModel).get({ plain: true })
                : null,
        };
    }

    /** Yêu cầu thay đổi của chính mình (trạng thái: chờ duyệt, đã duyệt, bị từ chối) */
    async ownRequests(user: User) {
        const member = await this.ownMember(user);
        return this.requestModel.findAll({
            where: { memberId: member._id },
            order: [["createdAt", "DESC"]],
            limit: 50,
            raw: true,
        });
    }

    async cancelOwnRequest(user: User, id: string) {
        const member = await this.ownMember(user);
        const row = await this.requestModel.findOne({
            where: { _id: id, memberId: member._id },
        });
        if (!row) throw ApiError.NotFound("error-record-not-found");
        if (row.status !== "PENDING")
            throw ApiError.Conflict("error-profile-request-not-pending");
        await row.update({
            status: "CANCELLED",
            decidedAt: new Date(),
            reason: "Người gửi hủy",
        });
        return row.get({ plain: true });
    }

    /** Admin toàn cục sửa trực tiếp (là người duyệt nên không qua hàng chờ); ghi lịch sử, kỳ áp dụng ngân hàng */
    async updateByAdmin(
        user: User,
        memberId: string,
        dto: Record<string, unknown>,
    ) {
        const member = await this.memberModel.findByPk(memberId, { raw: true });
        if (!member) throw ApiError.NotFound("error-record-not-found");
        // Giá trị đã che (•••) thì bỏ qua; CCCD không được trùng hồ sơ khác
        for (const key of ["nationalId", "bankAccount"])
            if (String(dto[key] ?? "").includes("•")) delete dto[key];
        await this.assertNationalIdFree(member._id, dto.nationalId);
        const update = await this.normalizeInput(
            this.pick(dto, ADMIN_EDITABLE),
        );
        await this.applyOfficial(member, update, user, "ADMIN");
        return this.memberModel.findByPk(member._id, { raw: true });
    }

    /** Lịch sử sửa hồ sơ kèm tên người sửa */
    async logs(memberId: string) {
        const rows = await this.logModel.findAll({
            where: { memberId },
            order: [["createdAt", "DESC"]],
            limit: 200,
            raw: true,
        });
        const ids = [
            ...new Set(rows.map((row) => row.changedBy).filter(Boolean)),
        ];
        const users = new Map(
            (ids.length
                ? await this.userModel.findAll({
                      where: { _id: ids },
                      raw: true,
                  })
                : []
            ).map((item) => [item._id, item.fullname || item.username]),
        );
        return rows.map((row) => ({
            ...row,
            changedByName: users.get(row.changedBy) ?? row.changedBy ?? "",
        }));
    }

    async ownLogs(user: User) {
        return this.logs((await this.ownMember(user))._id);
    }
}
