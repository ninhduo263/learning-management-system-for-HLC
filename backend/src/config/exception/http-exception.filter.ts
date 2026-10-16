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
        }
        if (!status) {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            message = "Internal Server Error";
        }

        return new ResponseErrorDto(code, status, message);
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
