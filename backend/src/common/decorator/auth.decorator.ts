import { RequestAuthData } from "@common/constant/class/request-auth-data";
import { DataPartitionGuard } from "@common/guard/data-partition.guard";
import { JwtAuthGuard } from "@common/guard/jwt-auth.guard";
import { SystemRoleGuard } from "@common/guard/system-role.guard";
import { ApiError } from "@config/exception/api-error";
import { AccessSsoJwtPayload } from "@module/auth/auth.interface";
import { AdminScope } from "@module/permission/common/constant";
import { SystemRole } from "@module/user/common/constant";
import { User } from "@module/user/entities/user.entity";
import {
    applyDecorators,
    createParamDecorator,
    ExecutionContext,
    SetMetadata,
    UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiSecurity } from "@nestjs/swagger";
import { Request } from "express";

export const AllowSystemRoles = (...systemRoles: SystemRole[]) => {
    return SetMetadata("system-roles", systemRoles);
};

export const ADMIN_SCOPE_METADATA = "admin-scope";

/**
 * Ngoài các role được phép, cho cả người có quyền admin phạm vi này (bảng AdminPermission).
 * Không gắn decorator thì route vẫn chỉ dành cho role được khai báo (mặc định Admin tổng).
 */
export const AllowAdminScope = (scope: AdminScope) =>
    SetMetadata(ADMIN_SCOPE_METADATA, scope);

export const ENABLE_DATA_PARTITION_METADATA = "enable-data-partition";
export const REQUIRE_DATA_PARTITION_METADATA = "require-data-partition";

export const EnableDataPartition = (value: boolean) =>
    SetMetadata(ENABLE_DATA_PARTITION_METADATA, value);

export const RequireDataPartition = (value: boolean) =>
    SetMetadata(REQUIRE_DATA_PARTITION_METADATA, value);

export const Authorization = () =>
    applyDecorators(
        UseGuards(
            JwtAuthGuard,
            // JwtSsoGuard,
            SystemRoleGuard,
            DataPartitionGuard,
        ),
        ApiBearerAuth(),
        ApiSecurity("dataPartitionCode"),
    );

export const ReqPayload = createParamDecorator(
    async (
        prop: keyof AccessSsoJwtPayload,
        ctx: ExecutionContext,
    ): Promise<AccessSsoJwtPayload | unknown> => {
        const request = ctx.switchToHttp().getRequest<Request>();
        if (request.user instanceof RequestAuthData) {
            const requestAuth = request.user as RequestAuthData;
            const payload = requestAuth.getPayload();
            return prop ? payload && payload[prop] : payload;
        }
        return undefined;
    },
);

export const ReqUser = createParamDecorator(
    async (prop: keyof User, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest<Request>();
        let user: any;
        if (request.user instanceof RequestAuthData) {
            const requestAuth = request.user as RequestAuthData;
            user = await requestAuth.getUser();
            if (!user) {
                throw ApiError.Unauthorized("error-unauthorized");
            }
        } else {
            user = request.user;
        }
        return prop ? user && user?.[prop] : user;
    },
);
