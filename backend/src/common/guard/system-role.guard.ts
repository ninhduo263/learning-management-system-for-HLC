import { RequestAuthData } from "@common/constant/class/request-auth-data";
import { ADMIN_SCOPE_METADATA } from "@common/decorator/auth.decorator";
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

@Injectable()
export class SystemRoleGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        @Optional()
        @Inject(ADMIN_SCOPE_CHECKER)
        private readonly adminScopeChecker?: AdminScopeChecker,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
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
            if (
                adminScope &&
                (await this.adminScopeChecker?.hasScope(user._id, adminScope))
            ) {
                return true;
            }
        }
        throw ApiError.Forbidden("error-forbidden");
    }
}
