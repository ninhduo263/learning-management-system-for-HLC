import { applyDecorators } from "@nestjs/common";
import { Prop } from "@nestjs/mongoose";
import * as Sentry from "@sentry/node";
import { compare, hash } from "bcryptjs";
import { Response } from "express";
import { Types } from "mongoose";
import { Op } from "sequelize";
import { Column } from "sequelize-typescript";

export type ObjectID = Types.ObjectId;
export const ObjectID = Types.ObjectId;

export const StrObjectId = () =>
    applyDecorators(
        Prop({ type: String, default: () => new ObjectID().toString() }),
        Column({
            primaryKey: true,
            defaultValue: () => new ObjectID().toString(),
        }) as PropertyDecorator,
    );

export const createUserPassword = async (password: string) =>
    hash(password, 10);
export const compareUserPassword = async (
    password: string,
    hashPassword: string,
) => compare(password, hashPassword);

export const MAX_TOPIC_SUBSCRIPTION = 5000;

export enum QueueName {
    ONE_SIGNAL = "OneSignal",
    AUDIT_LOG = "AuditLog",
}

export enum OperatorType {
    EQUAL = "eq",
    NOT_EQUAL = "ne",
    CONTAIN = "contain",
    NOT_CONTAIN = "not_contain",
    LIKE = "like",
    NOT_LIKE = "not_like",
    START_WITH = "start",
    END_WITH = "end",
    LESS_EQUAL = "lte",
    GREAT_EQUAL = "gte",
    LESS_THAN = "lt",
    GREAT_THAN = "gt",
    BETWEEN = "between",
    NOT_BETWEEN = "not_between",
    INCLUDE = "in",
    NOT_INCLUDE = "not_in",
    NOT_NULL = "not_null",
    NULL = "null",
    OR = "or",
    AND = "and",
}

export const OperatorSqlOptions = {
    [OperatorType.EQUAL]: Op.eq,
    [OperatorType.NOT_EQUAL]: Op.ne,
    [OperatorType.CONTAIN]: Op.iRegexp,
    [OperatorType.NOT_CONTAIN]: Op.notIRegexp,
    [OperatorType.START_WITH]: Op.iRegexp,
    [OperatorType.END_WITH]: Op.iRegexp,
    [OperatorType.LESS_EQUAL]: Op.lte,
    [OperatorType.LESS_THAN]: Op.lt,
    [OperatorType.GREAT_EQUAL]: Op.gte,
    [OperatorType.GREAT_THAN]: Op.gt,
    [OperatorType.BETWEEN]: Op.between,
    [OperatorType.NOT_BETWEEN]: Op.notBetween,
    [OperatorType.INCLUDE]: Op.in,
    [OperatorType.NOT_INCLUDE]: Op.notIn,
};

export enum ExportType {
    WORD = "word",
    PDF = "pdf",
    XLSX = "excel",
    ZIP = "zip",
}

export const exportFileHelper = (
    buffer: Buffer,
    filename: string,
    exportType: ExportType,
    res: Response,
) => {
    switch (exportType) {
        case ExportType.WORD: {
            res.setHeader(
                "Access-Control-Expose-Headers",
                "Content-Disposition",
            );
            res.setHeader(
                "Content-Type",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            );
            res.setHeader(
                "Content-Disposition",
                `filename="${encodeURIComponent(filename)}.docx"`,
            );
            break;
        }
        case ExportType.PDF: {
            res.setHeader(
                "Access-Control-Expose-Headers",
                "Content-Disposition",
            );
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader(
                "Content-Disposition",
                `filename="${encodeURIComponent(filename)}.pdf"`,
            );
            break;
        }
        case ExportType.XLSX: {
            res.setHeader(
                "Access-Control-Expose-Headers",
                "Content-Disposition",
            );
            res.setHeader(
                "Content-Type",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            );
            res.setHeader(
                "Content-Disposition",
                `filename="${encodeURIComponent(filename)}.xlsx"`,
            );
            break;
        }
        case ExportType.ZIP: {
            res.setHeader(
                "Access-Control-Expose-Headers",
                "Content-Disposition",
            );
            res.setHeader("Content-Type", "application/zip");
            res.setHeader(
                "Content-Disposition",
                `filename="${encodeURIComponent(filename)}.zip"`,
            );
            break;
        }
    }
    res.end(buffer);
};

export { Sentry };
