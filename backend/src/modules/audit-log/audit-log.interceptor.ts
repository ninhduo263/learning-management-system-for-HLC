import { QueueName } from "@common/constant";
import { RequestAuthData } from "@common/constant/class/request-auth-data";
import { ApiError } from "@config/exception/api-error";
import { Entity } from "@module/repository";
import { CreateDocument } from "@module/repository/common/base-repository.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { User } from "@module/user/entities/user.entity";
import { InjectQueue } from "@nestjs/bull";
import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Queue } from "bull";
import { Request } from "express";
import { catchError, map } from "rxjs";
import { AuditLogProps } from "./common/constant";
import { AuditLog } from "./entities/audit-log.entity";
import { AuditLogRepository } from "./repository/audit-log-repository.interface";

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
    constructor(
        private readonly reflector: Reflector,
        @InjectRepository(Entity.AUDIT_LOG)
        private readonly auditLogRepository: AuditLogRepository,
        @InjectQueue(QueueName.AUDIT_LOG)
        private auditLogQueue: Queue,
    ) {}

    async intercept(context: ExecutionContext, next: CallHandler) {
        const auditLogProps =
            this.reflector.get<AuditLogProps>(
                "audit-log",
                context.getHandler(),
            ) ||
            this.reflector.get<AuditLogProps>("audit-log", context.getClass());

        let log: CreateDocument<AuditLog>;
        if (auditLogProps) {
            const requestType = context.getType();
            switch (requestType) {
                case "http": {
                    const req = context.switchToHttp().getRequest<Request>();
                    let user: User;
                    if (req.user instanceof RequestAuthData) {
                        const requestAuth = req.user as RequestAuthData;
                        user = await requestAuth.getUser();
                        if (!user) {
                            throw ApiError.Unauthorized("error-unauthorized");
                        }
                    } else {
                        user = req.user as User;
                    }
                    log = {
                        uId: auditLogProps.uId || user?._id,
                        uCode: auditLogProps.uCode || user?.username,
                        uName: auditLogProps.uName || user?.fullname,
                        uEmail: auditLogProps.uEmail || user?.email,
                        requestType,
                        sourceId: auditLogProps.sourceId,
                        description: auditLogProps.description,
                        action:
                            auditLogProps?.action ||
                            `${req.method}${req.baseUrl}${req.route.path}`.toLowerCase(),
                        ip:
                            req.headers["x-forwarded-for"]?.toString() ||
                            req.socket.remoteAddress ||
                            req.ip,
                        data: req.body,
                        query: req.query,
                        param: req.params,
                        // ua: parser(req.headers["user-agent"]),
                        userAgent: req.headers["user-agent"],
                    };
                    break;
                }
                case "rpc": {
                    const rpc = context.switchToRpc();
                    const rpcContext = rpc.getContext();
                    const rpcData = rpc.getData();
                    log = {
                        uId: auditLogProps.uId,
                        uCode: auditLogProps.uCode,
                        uName: auditLogProps.uName,
                        uEmail: auditLogProps.uEmail,
                        requestType,
                        action: auditLogProps?.action,
                        data: {
                            context: rpcContext,
                            data: rpcData,
                        },
                    };
                    break;
                }
            }
        }
        if (!log) {
            return next.handle();
        }
        if (auditLogProps.logResponse) {
            return next.handle().pipe(
                map((data) => {
                    log.response = data;
                    this.auditLogQueue.add(
                        "emit-log",
                        { log },
                        {
                            removeOnComplete: true,
                            removeOnFail: true,
                            attempts: 3,
                        },
                    );
                    return data;
                }),
                catchError((err) => {
                    if (auditLogProps.logError) {
                        log.error = err;
                        this.auditLogQueue.add(
                            "emit-log",
                            { log },
                            {
                                removeOnComplete: true,
                                removeOnFail: true,
                                attempts: 3,
                            },
                        );
                    }
                    throw err;
                }),
            );
        } else {
            this.auditLogQueue.add(
                "emit-log",
                { log },
                {
                    removeOnComplete: true,
                    removeOnFail: true,
                    attempts: 3,
                },
            );
            return next.handle();
        }
    }
}
