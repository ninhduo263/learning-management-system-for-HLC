import { BaseService } from "@config/service/base.service";
import { Entity } from "@module/repository";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { InjectTransaction } from "@module/repository/common/transaction";
import { User } from "@module/user/entities/user.entity";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { MemberModel } from "../models/member.model";
import { MemberProfileService } from "./member-profile.service";
import { maskSensitive } from "./member-admin.service";
import { Member } from "../entities/member.entity";
import { MemberRepository } from "../repositories/member-repository.interface";

@Injectable()
export class MemberService extends BaseService<Member, MemberRepository> {
    constructor(
        @InjectRepository(Entity.MEMBER)
        private readonly memberRepository: MemberRepository,
        @InjectTransaction()
        private readonly memberTransaction: BaseTransaction,
        private readonly profileService: MemberProfileService,
        @InjectModel(MemberModel)
        private readonly memberModel: typeof MemberModel,
    ) {
        super(memberRepository, {
            notFoundCode: "error-record-not-found",
            transaction: memberTransaction,
        });
    }

    /** API danh sách / chi tiết không trả đầy đủ CCCD và số tài khoản (xem đầy đủ qua API riêng, có nhật ký) */
    private mask<T>(row: T): T {
        if (!row || typeof row !== "object") return row;
        const plain = (
            typeof (row as { get?: unknown }).get === "function"
                ? (row as unknown as { get: (o: object) => object }).get({
                      plain: true,
                  })
                : row
        ) as Record<string, unknown>;
        return {
            ...plain,
            nationalId: maskSensitive(plain.nationalId as string),
            bankAccount: maskSensitive(plain.bankAccount as string),
        } as T;
    }

    async getById(
        ...args: Parameters<BaseService<Member, MemberRepository>["getById"]>
    ) {
        return this.mask(await super.getById(...args));
    }

    async getOne(
        ...args: Parameters<BaseService<Member, MemberRepository>["getOne"]>
    ) {
        return this.mask(await super.getOne(...args));
    }

    async getMany(
        ...args: Parameters<BaseService<Member, MemberRepository>["getMany"]>
    ) {
        return (await super.getMany(...args)).map((row) => this.mask(row));
    }

    async getPage(
        ...args: Parameters<BaseService<Member, MemberRepository>["getPage"]>
    ) {
        const page = await super.getPage(...args);
        return { ...page, result: page.result.map((row) => this.mask(row)) };
    }

    /** Sửa qua CRUD (PUT /member/:id) cũng ghi lịch sử hồ sơ */
    async updateById(
        user: User,
        id: string,
        update: Parameters<
            BaseService<Member, MemberRepository>["updateById"]
        >[2],
        query?: Parameters<
            BaseService<Member, MemberRepository>["updateById"]
        >[3],
    ) {
        // Giá trị đã che (•••) gửi ngược lên thì bỏ qua, không ghi đè dữ liệu thật
        for (const key of ["nationalId", "bankAccount"])
            if (
                String(
                    (update as Record<string, unknown>)?.[key] ?? "",
                ).includes("•")
            )
                delete (update as Record<string, unknown>)[key];
        const before = await this.memberModel.findByPk(id, { raw: true });
        const result = await super.updateById(user, id, update, query);
        if (before && result)
            await this.profileService.logChanges(
                before,
                update as Record<string, unknown>,
                user,
                "ADMIN",
            );
        return result;
    }
}
