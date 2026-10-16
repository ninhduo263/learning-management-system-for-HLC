import { RequestAuthData } from "@common/constant/class/request-auth-data";
import {
    ENABLE_DATA_PARTITION_METADATA,
    REQUIRE_DATA_PARTITION_METADATA,
} from "@common/decorator/auth.decorator";
import { CommonClsState } from "@common/interface/common-cls-state";
import { ApiError } from "@config/exception/api-error";
import { AccessSsoJwtPayload } from "@module/auth/auth.interface";
import { DataPartitionUserService } from "@module/data-partition/services/data-partition-user.service";
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { ClsService } from "nestjs-cls";

@Injectable()
export class DataPartitionGuard implements CanActivate {
    constructor(
        private readonly dataPartitionUserService: DataPartitionUserService,

        private readonly clsService: ClsService<CommonClsState>,
        private readonly reflector: Reflector,
    ) {}

    async canActivate(context: ExecutionContext) {
        const enableDataPartition =
            this.reflector.get<boolean>(
                ENABLE_DATA_PARTITION_METADATA,
                context.getHandler(),
            ) ??
            this.reflector.get<boolean>(
                ENABLE_DATA_PARTITION_METADATA,
                context.getClass(),
            ) ??
            false;
        if (!enableDataPartition) {
            return true;
        }

        const requireDataPartition =
            this.reflector.get<boolean>(
                REQUIRE_DATA_PARTITION_METADATA,
                context.getHandler(),
            ) ??
            this.reflector.get<boolean>(
                REQUIRE_DATA_PARTITION_METADATA,
                context.getClass(),
            ) ??
            false;
        const req = context.switchToHttp().getRequest<Request>();
        const dataPartitionCode =
            req.headers["x-data-partition-code"]?.toString();

        // Required data partition -> throw error if data partition code is empty
        if (requireDataPartition && !dataPartitionCode) {
            throw ApiError.Forbidden("error-forbidden");
        }
        if (dataPartitionCode) {
            const requestAuth = req.user;
            if (requestAuth instanceof RequestAuthData) {
                const payload = requestAuth.getPayload() as AccessSsoJwtPayload;
                const dataPartition =
                    await this.dataPartitionUserService.getOneDpUser(
                        dataPartitionCode,
                        payload.sub,
                    );
                if (dataPartition) {
                    this.clsService.set("dataPartition", dataPartition);
                    return true;
                }
            }
            throw ApiError.Forbidden("error-forbidden");
        } else {
            return true;
        }
    }
}
