import { RequestAuthData } from "@common/constant/class/request-auth-data";
import { ApiError } from "@config/exception/api-error";
import { SystemRole } from "@module/user/common/constant";
import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";

@Injectable()
export class SystemRoleGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

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
        }
        throw ApiError.Forbidden("error-forbidden");
    }
}
