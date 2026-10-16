import { ErrorCode } from "@config/exception/error-code";
import { HttpStatus } from "@nestjs/common";

export class ApiError extends Error {
    constructor(
        private readonly code: ErrorCode,
        private readonly status: HttpStatus,
        private readonly args: { [field: string]: unknown },
    ) {
        super();
        Error.captureStackTrace(this);
    }

    getCode() {
        return this.code;
    }

    getStatus() {
        return this.status;
    }

    getArgs() {
        return this.args;
    }

    static BadRequest(code: ErrorCode, args?: { [field: string]: unknown }) {
        return new ApiError(code, HttpStatus.BAD_REQUEST, args);
    }

    static Unauthorized(code: ErrorCode, args?: { [field: string]: unknown }) {
        return new ApiError(code, HttpStatus.UNAUTHORIZED, args);
    }

    static Forbidden(code: ErrorCode, args?: { [field: string]: unknown }) {
        return new ApiError(code, HttpStatus.FORBIDDEN, args);
    }

    static NotFound(code: ErrorCode, args?: { [field: string]: unknown }) {
        return new ApiError(code, HttpStatus.NOT_FOUND, args);
    }

    static MethodNotAllowed(
        code: ErrorCode,
        args?: { [field: string]: unknown },
    ) {
        return new ApiError(code, HttpStatus.METHOD_NOT_ALLOWED, args);
    }

    static Conflict(code: ErrorCode, args?: { [field: string]: unknown }) {
        return new ApiError(code, HttpStatus.CONFLICT, args);
    }

    static UnsupportedMediaType(
        code: ErrorCode,
        args?: { [field: string]: unknown },
    ) {
        return new ApiError(code, HttpStatus.UNSUPPORTED_MEDIA_TYPE, args);
    }

    static HttpStatusOk(code: ErrorCode, args?: { [field: string]: unknown }) {
        return new ApiError(code, HttpStatus.OK, args);
    }
}
