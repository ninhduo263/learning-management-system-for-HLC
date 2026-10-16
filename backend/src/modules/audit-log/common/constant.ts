import { SetMetadata } from "@nestjs/common";
import { AuditLog } from "../entities/audit-log.entity";

export interface AuditLogProps
    extends Partial<
        Pick<
            AuditLog,
            | "uId"
            | "uCode"
            | "uName"
            | "uEmail"
            | "action"
            | "logResponse"
            | "logError"
            | "description"
            | "sourceId"
        >
    > {}

export const UseAuditLog = (props: AuditLogProps = {}) =>
    SetMetadata("audit-log", props);
