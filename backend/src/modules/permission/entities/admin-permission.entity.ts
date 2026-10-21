import { EntityDefinition } from "@common/constant/class/entity-definition";
import { BaseEntity } from "@common/interface/base-entity.interface";
import {
    IsEnum,
    IsOptional,
    IsString,
    MaxLength,
    ValidateIf,
} from "class-validator";
import { AdminScope } from "../common/constant";

export class AdminPermission implements BaseEntity {
    _id: string;

    @IsString()
    @MaxLength(24)
    @EntityDefinition.field({ label: "Tài khoản", required: true })
    userId: string;

    @IsEnum(AdminScope)
    @EntityDefinition.field({
        label: "Phạm vi",
        required: true,
        enum: Object.values(AdminScope),
    })
    scope: AdminScope;

    /** Bắt buộc khi scope = LEARNING_MODULE, để trống với các phạm vi khác */
    @IsString()
    @MaxLength(24)
    @ValidateIf(
        (permission: AdminPermission) =>
            permission.scope === AdminScope.LEARNING_MODULE ||
            permission.moduleId !== undefined,
    )
    @EntityDefinition.field({ label: "Module học tập" })
    moduleId?: string;

    @IsString()
    @MaxLength(24)
    @IsOptional()
    @EntityDefinition.field({ label: "Người cấp quyền" })
    grantedBy?: string;

    @IsString()
    @IsOptional()
    @EntityDefinition.field({ label: "Ghi chú" })
    note?: string;
}
