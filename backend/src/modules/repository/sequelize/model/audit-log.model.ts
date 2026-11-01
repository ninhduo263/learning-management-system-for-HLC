import { StrObjectId } from "@common/constant";
import { AuditLog } from "@module/audit-log/entities/audit-log.entity";
import { Entity } from "@module/repository";
import { compile } from "handlebars";
import _ from "lodash";
import { Op } from "sequelize";
import {
    BeforeCreate,
    Column,
    DataType,
    Model,
    Table,
} from "sequelize-typescript";
import { IResult } from "ua-parser-js";

@Table({
    tableName: Entity.AUDIT_LOG,
    indexes: [
        { fields: ["createdAt"] },
        { fields: ["uId"] },
        { fields: ["action"] },
        { fields: ["sourceId"], where: { sourceId: { [Op.not]: null } } },
    ],
})
export class AuditLogModel extends Model implements AuditLog {
    @StrObjectId()
    _id: string;

    @Column
    uId: string;

    @Column
    uCode: string;

    @Column
    uEmail: string;

    @Column
    uName: string;

    @Column
    requestType: string;

    @Column
    action: string;

    @Column
    ip?: string;

    @Column({ type: DataType.JSONB })
    data?: unknown;

    @Column({ type: DataType.JSONB })
    query?: unknown;

    @Column({ type: DataType.JSONB })
    param?: unknown;

    @Column({ type: DataType.JSONB })
    ua?: IResult;

    @Column({ type: DataType.TEXT })
    userAgent?: string;

    @Column({ type: DataType.JSONB })
    response?: unknown;

    @Column({ type: DataType.JSONB })
    error?: unknown;

    @Column({})
    sourceId?: string;

    @Column({ type: DataType.TEXT })
    description?: string;

    @Column
    createdAt?: Date;

    @BeforeCreate
    static transformLog(auditLog: AuditLogModel) {
        if (auditLog.sourceId) {
            auditLog.sourceId = _.get(auditLog, auditLog.sourceId) || null;
        }
        if (auditLog.description) {
            auditLog.description =
                compile(auditLog.description)(auditLog) || null;
        }
    }
}
