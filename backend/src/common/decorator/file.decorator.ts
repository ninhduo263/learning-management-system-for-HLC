import { FileTypeInterceptor } from "@common/interceptor/file-type.interceptor";
import { applyDecorators, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";

export const UploadFile = () =>
    applyDecorators(
        UseInterceptors(FileInterceptor("file")),
        UseInterceptors(FileTypeInterceptor),
    );
