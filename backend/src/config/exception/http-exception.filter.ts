import { Sentry } from "@common/constant";
import { ResponseErrorDto } from "@common/dto/response-error.dto";
import { Configuration, Environment } from "@config/configuration";
import { ApiError } from "@config/exception/api-error";
import { ErrorCode } from "@config/exception/error-code";
import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request, Response } from "express";
import moment from "moment";
import { I18nService } from "nestjs-i18n";
import {
    DatabaseError,
    ForeignKeyConstraintError,
    UniqueConstraintError,
    ValidationError,
} from "sequelize";

// Mã lỗi Postgres do dữ liệu đầu vào sai: NOT NULL, CHECK, sai định dạng ngày/giá trị
const INVALID_INPUT_PG_CODES = ["23502", "23514", "22007", "22008", "22P02"];

/** Tên hiển thị của các trường hay gặp khi báo lỗi nhập liệu */
const FIELD_LABELS: Record<string, string> = {
    pointRate: "Đơn giá",
    baseAllowance: "Phụ cấp cơ bản",
    payoutDate: "Ngày chi trả",
    amount: "Số tiền",
    points: "Số điểm",
    reason: "Lý do",
    contributionDate: "Ngày đóng",
    coverUntil: "Đóng đến ngày",
    fileIds: "Ảnh minh chứng",
    startAt: "Giờ bắt đầu",
    endAt: "Giờ kết thúc",
    content: "Nội dung",
    name: "Tên",
    fullName: "Họ tên",
    memberId: "Thành viên",
    month: "Tháng",
    mentorCode: "Mã MTO",
    menteeCode: "Mã MTE",
    email: "Email",
    bankAccount: "Số tài khoản",
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private environment: Environment;

    constructor(
        configService: ConfigService<Configuration>,
        private readonly i18n: I18nService,
    ) {
        this.environment = configService.get("server.env", { infer: true });
    }

    private createError(exception: unknown) {
        let code: ErrorCode;
        let status: HttpStatus;
        let message: string;
        if (exception instanceof ApiError) {
            code = exception.getCode();
            status = exception.getStatus();
            message = this.i18n.t(`error-message.${exception.getCode()}`, {
                args: exception.getArgs(),
            });
        }
        if (exception instanceof HttpException) {
            status = exception.getStatus();
            message = exception.message;
            const validation = this.validationMessage(exception);
            if (validation) {
                code = "error-validation-failed";
                message = validation;
            }
        }
        const sqlError = this.getSqlError(exception);
        if (sqlError) {
            [code, status] = sqlError;
            message = this.i18n.t(`error-message.${code}`);
        }
        if (!status) {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            message = "Internal Server Error";
        }

        return new ResponseErrorDto(code, status, message);
    }

    /** Lỗi kiểm tra dữ liệu (ValidationPipe) -> thông báo tiếng Việt dễ hiểu, không hiện lỗi kỹ thuật */
    private validationMessage(exception: HttpException) {
        if (exception.getStatus() !== HttpStatus.BAD_REQUEST) return null;
        const body = exception.getResponse() as { message?: unknown };
        if (!Array.isArray(body?.message)) return null;
        const messages = (body.message as string[]).map((item) => {
            const match = /^([a-zA-Z0-9_.]+) (must|should|has|is) /.exec(
                String(item),
            );
            if (!match) return String(item);
            const field = match[1].split(".").pop();
            return `${FIELD_LABELS[field] ?? field} không hợp lệ`;
        });
        return `Dữ liệu nhập chưa đúng: ${[...new Set(messages)].join("; ")}`;
    }

    private getSqlError(exception: unknown): [ErrorCode, HttpStatus] | null {
        if (exception instanceof UniqueConstraintError) {
            return ["error-record-duplicate", HttpStatus.CONFLICT];
        }
        if (exception instanceof ForeignKeyConstraintError) {
            return ["error-record-reference-invalid", HttpStatus.BAD_REQUEST];
        }
        if (exception instanceof ValidationError) {
            return ["error-record-invalid", HttpStatus.BAD_REQUEST];
        }
        if (
            exception instanceof DatabaseError &&
            INVALID_INPUT_PG_CODES.includes(
                (exception.parent as { code?: string })?.code,
            )
        ) {
            return ["error-record-invalid", HttpStatus.BAD_REQUEST];
        }
        return null;
    }

    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const errResponse = this.createError(exception);

        const request = ctx.getRequest<Request>();
        console.error(
            `\n${moment().format("DD/MM/YYYY HH:mm:ss")}`,
            request.method,
            request.originalUrl,
            { ...errResponse },
        );
        console.error(exception);
        if (this.environment !== Environment.PRODUCTION) {
            errResponse.detail = {
                exception,
                stack: exception.stack,
                message: exception.message ? exception.message : undefined,
            };
        }

        if (
            exception instanceof ApiError ||
            errResponse.getStatus() === HttpStatus.INTERNAL_SERVER_ERROR
        ) {
            let sentryHeaders: unknown;
            let sentryBody: unknown;
            if (this.environment !== Environment.PRODUCTION) {
                sentryHeaders = request.headers;
                sentryBody = request.body;
            } else {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { authorization, ...safeHeaders } = request.headers;
                sentryHeaders = safeHeaders;
            }
            const sentryExtra = {
                response: errResponse,
                headers: sentryHeaders,
                body: sentryBody,
                ip: request.ip,
            };

            Sentry.captureException(exception, {
                extra: sentryExtra,
            });
        }
        response.status(errResponse.getStatus()).json(errResponse);
    }
}
