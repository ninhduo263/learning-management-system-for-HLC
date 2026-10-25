import { RequestAuthData } from "@common/constant/class/request-auth-data";
import {
    ADMIN_SCOPE_METADATA,
    READ_ONLY_OPERATION_METADATA,
} from "@common/decorator/auth.decorator";
import {
    ADMIN_SCOPE_CHECKER,
    AdminScopeChecker,
} from "@common/interface/admin-scope-checker.interface";
import { ApiError } from "@config/exception/api-error";
import { SystemRole } from "@module/user/common/constant";
import {
    CanActivate,
    ExecutionContext,
    Inject,
    Injectable,
    Optional,
    UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { SecurityConfigService } from "@module/setting/security-config.service";

/** Khi bắt buộc đổi mật khẩu lần đầu: chỉ cho các API cần để đăng nhập và đổi mật khẩu */
const PASSWORD_CHANGE_ALLOWED: [string, RegExp][] = [
    ["GET", /\/user\/me$/],
    ["PUT", /\/user\/me\/password$/],
    ["GET", /\/access\/me$/],
    ["GET", /\/system-config$/],
    ["GET", /\/member\/me(\/profile)?$/],
    ["GET", /\/time\/mock$/],
    ["GET", /\/provinces$/],
];

@Injectable()
export class SystemRoleGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        @Optional()
        @Inject(ADMIN_SCOPE_CHECKER)
        private readonly adminScopeChecker?: AdminScopeChecker,
        @Optional()
        private readonly securityConfig?: SecurityConfigService,
    ) {}

    /**
     * Công tắc "bắt buộc đổi mật khẩu lần đầu" đang bật và tài khoản (không phải Admin toàn cục) chưa tự đổi
     * mật khẩu lần nào: chặn mọi API trừ các API đăng nhập / đổi mật khẩu.
     */
    private async assertPasswordChanged(request: Request) {
        const auth = request.user;
        if (!(auth instanceof RequestAuthData) || !this.securityConfig) return;
        const user = await auth.getUser();
        if (
            !user ||
            user.systemRole === SystemRole.ADMIN ||
            user.passwordChangedAt
        )
            return;
        const config = await this.securityConfig.get();
        if (!config.forcePasswordChangeOnFirstLogin) return;
        const path = (request.originalUrl || request.url || "").split("?")[0];
        if (
            PASSWORD_CHANGE_ALLOWED.some(
                ([method, pattern]) =>
                    request.method === method && pattern.test(path),
            )
        )
            return;
        throw ApiError.Forbidden("error-password-change-required");
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        await this.assertPasswordChanged(
            context.switchToHttp().getRequest<Request>(),
        );
        const systemRoles =
            this.reflector.get<SystemRole[]>(
                "system-roles",
                context.getHandler(),
            ) ||
            this.reflector.get<SystemRole[]>(
                "system-roles",
                context.getClass(),
            );

        if (systemRoles === undefined) {
            return true;
        }
        const requestAuth = context.switchToHttp().getRequest<Request>().user;
        if (requestAuth instanceof RequestAuthData) {
            const user = await requestAuth.getUser();
            if (!user) {
                throw new UnauthorizedException();
            }
            if (systemRoles.includes(user?.systemRole)) {
                return true;
            }
            const adminScope = this.reflector.getAllAndOverride<string>(
                ADMIN_SCOPE_METADATA,
                [context.getHandler(), context.getClass()],
            );
            // Request đổi dữ liệu chỉ qua được bằng phạm vi có quyền GHI; phạm vi "chỉ xem" (được bao hàm) chỉ đọc
            const method = context
                .switchToHttp()
                .getRequest<Request>()
                .method.toUpperCase();
            const readOnlyRoute = this.reflector.get<boolean>(
                READ_ONLY_OPERATION_METADATA,
                context.getHandler(),
            );
            const write =
                !["GET", "HEAD", "OPTIONS"].includes(method) && !readOnlyRoute;
            if (
                adminScope &&
                (await this.adminScopeChecker?.hasScope(
                    user._id,
                    adminScope,
                    write,
                ))
            ) {
                return true;
            }
        }
        throw ApiError.Forbidden("error-forbidden");
    }
}
