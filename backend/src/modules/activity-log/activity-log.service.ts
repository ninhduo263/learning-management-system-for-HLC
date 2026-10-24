import { User } from "@module/user/entities/user.entity";
import { UserModel } from "@module/repository/sequelize/model/user.model";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Op, Transaction, WhereOptions } from "sequelize";
import { ActivityLogModel } from "./activity-log.model";

export interface ActivityInput {
    module: string;
    action: string;
    targetId?: string | null;
    targetName?: string | null;
    summary: string;
    detail?: Record<string, unknown> | null;
    /** Làm thay cho ai (ủy quyền) */
    onBehalfOf?: { memberId: string; name: string } | null;
}

/** Ghi / đọc nhật ký thao tác quản trị */
@Injectable()
export class ActivityLogService {
    constructor(
        @InjectModel(ActivityLogModel)
        private readonly logModel: typeof ActivityLogModel,
        @InjectModel(UserModel)
        private readonly userModel: typeof UserModel,
    ) {}

    async log(
        user: Pick<User, "_id" | "username" | "fullname"> | null,
        input: ActivityInput,
        t?: Transaction,
    ) {
        await this.logModel.create(
            {
                module: input.module,
                action: input.action,
                targetId: input.targetId ?? null,
                targetName: input.targetName ?? null,
                summary: input.summary,
                detail: input.detail ?? null,
                actorUserId: user?._id ?? null,
                actorName: user
                    ? user.fullname || user.username || user._id
                    : "Hệ thống",
                onBehalfOfMemberId: input.onBehalfOf?.memberId ?? null,
                onBehalfOfName: input.onBehalfOf?.name ?? null,
            },
            { transaction: t },
        );
    }

    async list(
        filter: {
            module?: string;
            action?: string;
            targetId?: string;
            from?: string;
            to?: string;
            keyword?: string;
        } = {},
        limit = 300,
    ) {
        const where: WhereOptions = {
            ...(filter.module && { module: filter.module }),
            ...(filter.action && { action: filter.action }),
            ...(filter.targetId && { targetId: filter.targetId }),
            ...((filter.from || filter.to) && {
                createdAt: {
                    ...(filter.from && {
                        [Op.gte]: new Date(`${filter.from}T00:00:00+07:00`),
                    }),
                    ...(filter.to && {
                        [Op.lte]: new Date(`${filter.to}T23:59:59+07:00`),
                    }),
                },
            }),
            ...(filter.keyword && {
                [Op.or]: [
                    { summary: { [Op.iLike]: `%${filter.keyword}%` } },
                    { targetName: { [Op.iLike]: `%${filter.keyword}%` } },
                    { actorName: { [Op.iLike]: `%${filter.keyword}%` } },
                ],
            }),
        };
        return this.logModel.findAll({
            where,
            order: [["createdAt", "DESC"]],
            limit: Math.min(Math.max(limit, 1), 1000),
            raw: true,
        });
    }
}
