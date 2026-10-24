import { BaseService } from "@config/service/base.service";
import { Entity } from "@module/repository";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { InjectTransaction } from "@module/repository/common/transaction";
import { ApiError } from "@config/exception/api-error";
import { User } from "@module/user/entities/user.entity";
import { Injectable } from "@nestjs/common";
import { PointSourceType } from "../common/constant";
import { RolePermission } from "@module/organization/common/constant";
import { GroupAccessService } from "@module/organization/flow/group-access.service";
import { PointRule } from "../entities/point-rule.entity";
import { UpdateDocument } from "@module/repository/common/base-repository.interface";
import { PointRuleRepository } from "../repositories/point-rule-repository.interface";

@Injectable()
export class PointRuleService extends BaseService<
    PointRule,
    PointRuleRepository
> {
    constructor(
        @InjectRepository(Entity.POINT_RULE)
        private readonly pointRuleRepository: PointRuleRepository,
        @InjectTransaction()
        private readonly pointRuleTransaction: BaseTransaction,
        private readonly groupAccess: GroupAccessService,
    ) {
        super(pointRuleRepository, {
            notFoundCode: "error-record-not-found",
            transaction: pointRuleTransaction,
        });
    }

    /** Rule sinh điểm chức vụ: cấu hình ở Vai trò, không sửa ở màn hình điểm phụ cấp */
    static isRoleManaged(rule: Pick<PointRule, "sourceType">) {
        return [
            PointSourceType.MEMBER_POSITION,
            PointSourceType.GROUP_COMPLETION,
        ].includes(rule.sourceType);
    }

    /** Điều kiện tính điểm là logic hệ thống: không tạo rule mới qua API */
    async create(user: User, dto: Partial<PointRule>): Promise<PointRule> {
        if (dto && PointRuleService.isRoleManaged(dto as PointRule))
            throw ApiError.BadRequest("error-rule-managed-by-role");
        throw ApiError.BadRequest("error-rule-create-disabled");
    }

    /** Chỉ sửa tên, loại điểm, số điểm, đối tượng, bật/tắt, hiệu lực */
    async updateById(
        user: User,
        id: string,
        update: UpdateDocument<PointRule>,
        query?: Parameters<
            BaseService<PointRule, PointRuleRepository>["updateById"]
        >[3],
    ) {
        await this.groupAccess.assertCan(user, RolePermission.EDIT_POINTS);
        const current = await this.getById(user, id);
        if (current && PointRuleService.isRoleManaged(current))
            throw ApiError.BadRequest("error-rule-managed-by-role");
        const allowed = [
            "name",
            "pointTypeId",
            "points",
            "targetMemberType",
            "isActive",
            "maxPointsPerPeriod",
            "effectiveFrom",
            "effectiveTo",
        ];
        const safe = Object.fromEntries(
            Object.entries(update ?? {}).filter(([key]) =>
                allowed.includes(key),
            ),
        ) as UpdateDocument<PointRule>;
        return super.updateById(user, id, safe, query);
    }

    async updateManyByIds(): Promise<never> {
        throw ApiError.BadRequest("error-rule-create-disabled");
    }

    async deleteManyByIds(): Promise<never> {
        throw ApiError.BadRequest("error-rule-create-disabled");
    }

    async deleteById(): Promise<never> {
        throw ApiError.BadRequest("error-rule-create-disabled");
    }
}
