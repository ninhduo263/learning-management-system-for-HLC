import { GetPageQuery } from "@common/constant";
import {
    ApiCondition,
    ApiGet,
    ApiPageResponse,
} from "@common/decorator/api.decorator";
import { ReqUser } from "@common/decorator/auth.decorator";
import {
    RequestCondition,
    RequestQuery,
} from "@common/decorator/query.decorator";
import { BaseControllerFactory } from "@config/controller/base-controller-factory";
import { QueryCondition } from "@module/repository/common/base-repository.interface";
import { User } from "@module/user/entities/user.entity";
import { Controller, Get } from "@nestjs/common";
import { ApiTags, OmitType, PartialType } from "@nestjs/swagger";
import { AuditLogService } from "./audit-log.service";
import { AuditLog } from "./entities/audit-log.entity";

@Controller("audit-log")
@ApiTags("Audit log")
export class AuditLogController extends BaseControllerFactory(
    AuditLog,
    PartialType(AuditLog),
    OmitType(AuditLog, ["_id"]),
    PartialType(OmitType(AuditLog, ["_id"])),
    {
        routes: {
            create: {
                enable: false,
            },
            updateById: {
                enable: false,
            },
            deleteById: {
                enable: false,
            },
        },
        import: {
            enable: false,
        },
    },
) {
    constructor(private readonly auditLogService: AuditLogService) {
        super(auditLogService);
    }

    @Get("page/me")
    @ApiGet({ mode: "page" })
    @ApiCondition()
    @ApiPageResponse(AuditLog)
    async getPageMe(
        @ReqUser() user: User,
        @RequestCondition(AuditLog) condition: QueryCondition<AuditLog>,
        @RequestQuery() query: GetPageQuery<AuditLog>,
    ) {
        return this.auditLogService.getPageMe(user, condition, query);
    }
}
