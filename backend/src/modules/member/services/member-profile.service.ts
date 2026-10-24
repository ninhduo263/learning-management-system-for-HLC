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

/** Trường được ghi lịch sử khi thay đổi */
export const TRACKED_FIELDS = [
    "fullName",
    "memberType",
    "status",
    "dateOfBirth",
    "gender",
    "phone",
    "email",
    "address",
    "hometown",
    "hometownCode",
    "addressCode",
    "major",
    "occupation",
    "profileUrl",
    "bankAccount",
    "bankName",
    "joinedAt",
] as const;
/**
 * Thành viên tự sửa. Quê quán / địa chỉ chọn từ danh mục tỉnh (hometownCode / addressCode), không nhập tự do.
 * Link profile tạm thời chỉ Admin sửa (mở lại bằng công tắc "memberCanEditProfileUrl").
 */
export const SELF_EDITABLE = [
    "dateOfBirth",
    "gender",
    "phone",
    "email",
    "hometownCode",
    "addressCode",
    "major",
    "occupation",
    "bankAccount",
    "bankName",
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
];

const normalize = (value: unknown) =>
    value === undefined || value === null || value === ""
        ? null
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
        role: "SELF" | "ADMIN",
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

    private async save(
        member: Member,
        update: Record<string, unknown>,
        user: User,
        role: "SELF" | "ADMIN",
    ) {
        await this.sequelize.transaction(async (t) => {
            await this.logChanges(member, update, user, role, t);
            await this.memberModel.update(update, {
                where: { _id: member._id },
                transaction: t,
            });
        });
        return this.memberModel.findByPk(member._id, { raw: true });
    }

    /** Kiểm tra mã tỉnh trong danh mục */
    private async checkProvinces(update: Record<string, unknown>) {
        for (const field of ["hometownCode", "addressCode"])
            if (field in update)
                update[field] = await this.provinces.assertCode(
                    update[field] as string,
                );
        return update;
    }

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
        return this.save(
            member,
            await this.checkProvinces(this.pick(dto, allowed)),
            user,
            "SELF",
        );
    }

    async updateByAdmin(
        user: User,
        memberId: string,
        dto: Record<string, unknown>,
    ) {
        const member = await this.memberModel.findByPk(memberId, { raw: true });
        if (!member) throw ApiError.NotFound("error-record-not-found");
        return this.save(
            member,
            await this.checkProvinces(this.pick(dto, ADMIN_EDITABLE)),
            user,
            "ADMIN",
        );
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
