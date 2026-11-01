import { ApiError } from "@config/exception/api-error";
import { ALLOW_MIME_TYPES, compressFile } from "@module/file/common/constant";
import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { throwError } from "rxjs";

@Injectable()
export class FileTypeInterceptor implements NestInterceptor {
    constructor(private readonly reflector: Reflector) {}

    async intercept(context: ExecutionContext, next: CallHandler) {
        const req = context.switchToHttp().getRequest<Express.Request>();
        if (!req.file) {
            return next.handle().pipe(() =>
                throwError(() => {
                    throw ApiError.BadRequest("error-file-not-found");
                }),
            );
        }

        const { buffer, fileType } = await compressFile(req.file.buffer);
        if (
            fileType?.ext !== "cfb" &&
            !ALLOW_MIME_TYPES.data.some((m) => m.type === fileType?.mime)
        ) {
            return next.handle().pipe(() => {
                return throwError(() => {
                    throw ApiError.BadRequest("error-file-invalid-mimetype", {
                        mime: fileType?.mime,
                    });
                });
            });
        }
        req.file.buffer = buffer;
        req.file.size = buffer.byteLength;
        req.file.mimetype = fileType?.mime || req.file.mimetype;
        return next.handle().pipe();
    }
}
