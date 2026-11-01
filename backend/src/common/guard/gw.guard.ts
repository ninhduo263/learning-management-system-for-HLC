import { Configuration } from "@config/configuration";
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { Request } from "express";

@Injectable()
export class GwGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly configService: ConfigService<Configuration>,
    ) {}

    canActivate(context: ExecutionContext): boolean {
        const requestType = context.getType();
        if (requestType === "http") {
            const request = context.switchToHttp().getRequest<Request>();
            const { gwApiKey } = this.configService.get("server", {
                infer: true,
            });
            return request.headers["x-gw-api-key"] === gwApiKey;
        }
        if (requestType === "rpc") {
            // TODO
        }
        return true;
    }
}
