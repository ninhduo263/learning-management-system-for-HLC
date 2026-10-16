import { Sentry } from "@common/constant";
import { StringUtil } from "@common/utils/string.util";
import { Configuration } from "@config/configuration";
import { ApiError } from "@config/exception/api-error";
import { FileRepository } from "@module/file/repository/file-repository.interface";
import { InjectMinioClient, MinioClient } from "@module/minio/minio.provider";
import { Entity } from "@module/repository";
import { CreateDocument } from "@module/repository/common/base-repository.interface";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { InjectTransaction } from "@module/repository/common/transaction";
import { SettingKey } from "@module/setting/common/constant";
import { SettingService } from "@module/setting/setting.service";
import { SsoService } from "@module/sso/sso.service";
import { User } from "@module/user/entities/user.entity";
import {
    Injectable,
    Logger,
    NotImplementedException,
    OnApplicationBootstrap,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NextFunction, Request, Response } from "express";
import { JWTPayload } from "jose";
import { PreSignRequestParams } from "minio/dist/main/internal/type";
import pLimit from "p-limit";
import { extname } from "path";
import { v4 } from "uuid";
import { compressFile, FileScope, FileStorageType } from "./common/constant";
import { ClientCompleteMultipartUploadDto } from "./dto/client-complete-multipart-upload.dto";
import { ClientInitMultipartUploadResponseDto } from "./dto/client-init-multipart-upload-response.dto";
import { ClientInitMultipartUploadDto } from "./dto/client-init-multipart-upload.dto";
import { CreateFileResponseDto } from "./dto/create-file-response.dto";
import { CreateFileDto } from "./dto/create-file.dto";
import { File } from "./entities/file.entity";

@Injectable()
export class FileService implements OnApplicationBootstrap {
    constructor(
        @InjectRepository(Entity.FILE)
        private readonly fileRepository: FileRepository,
        @InjectMinioClient()
        private readonly minioClient: MinioClient,
        private readonly configService: ConfigService<Configuration>,
        private readonly settingService: SettingService,
        private readonly ssoService: SsoService,
        @InjectTransaction()
        private readonly transaction: BaseTransaction,
    ) {}

    async onApplicationBootstrap() {
        const setting = await this.settingService.getSettingValue(
            SettingKey.FILE_STORAGE,
        );
        const fileStorageType = this.configService.get(
            "server.defaultFileStorage",
            {
                infer: true,
            },
        );
        if (!setting) {
            await this.settingService.setSettingValue(SettingKey.FILE_STORAGE, {
                type: fileStorageType,
            });
            Logger.verbose("File setting initialized", FileService.name);
        }
    }

    private async getUrl(file: File) {
        const serverAddress = this.configService.get("server.address", {
            infer: true,
        });
        return `${serverAddress}/file/${file._id}/${encodeURIComponent(
            file.name,
        )}`;
    }

    private async createFileData(file: Express.Multer.File) {
        const setting = await this.settingService.getSettingValue(
            SettingKey.FILE_STORAGE,
        );
        let data: string;
        const filename = Buffer.from(file.originalname, "latin1").toString(
            "utf8",
        );
        switch (setting.type) {
            case FileStorageType.DATABASE: {
                data = file.buffer.toString("base64");
                break;
            }
            case FileStorageType.S3: {
                const { bucket } = this.configService.get("minio", {
                    infer: true,
                });
                data = `${Date.now()}_${v4()}${extname(
                    file.originalname,
                ).toLowerCase()}`;
                await this.minioClient.putObject(
                    bucket,
                    data,
                    file.buffer,
                    file.size,
                    {
                        filename: encodeURIComponent(filename),
                    },
                );
                break;
            }
            default: {
                throw new NotImplementedException();
            }
        }
        return { data, filename, setting };
    }

    async create(
        user: User,
        dto: CreateFileDto,
        file: Express.Multer.File,
    ): Promise<CreateFileResponseDto> {
        const { data, filename, setting } = await this.createFileData(file);
        const doc: CreateDocument<File> = {
            ...dto,
            name: filename,
            author: user._id,
            authorName:
                user.fullname ||
                [user.lastname, user.firstname].filter(Boolean).join(" ") ||
                user.username,
            mimetype: file.mimetype,
            storageType: setting.type,
            size: file.size,
            data,
        };
        const resFile = await this.fileRepository.create(doc);
        const url = await this.getUrl(resFile);
        resFile.data = undefined;
        return { file: resFile, url };
    }

    private async accessFile(id: string, req: Request) {
        // TODO: Phân quyền đọc file
        const file = await this.fileRepository.getById(id);
        if (!file) {
            throw ApiError.NotFound("error-file-not-found");
        }
        let payload: JWTPayload;
        switch (file.scope) {
            case FileScope.INTERNAL: {
                try {
                    payload = await this.ssoService.verify(
                        req.headers.authorization,
                    );
                } catch (err) {
                    Sentry.captureException(err);
                    throw ApiError.NotFound("error-file-not-found");
                }
                break;
            }
            case FileScope.PRIVATE: {
                try {
                    payload = await this.ssoService.verify(
                        req.headers.authorization,
                    );
                } catch (err) {
                    Sentry.captureException(err);
                    throw ApiError.NotFound("error-file-not-found");
                }
                if (file.author !== payload.sub) {
                    throw ApiError.NotFound("error-file-not-found");
                }
                break;
            }
            case FileScope.PUBLIC:
            default: {
                try {
                    payload = await this.ssoService.verify(
                        req.headers.authorization,
                    );
                } catch (err) {
                    console.error(err);
                    payload = null;
                }
            }
        }
        return { file, payload };
    }

    async getFileData(
        user: User,
        id: string,
        req: Request,
        res: Response,
        next: NextFunction,
    ) {
        const { file } = await this.accessFile(id, req);

        switch (file.storageType) {
            case FileStorageType.DATABASE: {
                if (file) {
                    res.setHeader("Content-Type", file.mimetype);
                    return res.end(Buffer.from(file.data, "base64"));
                } else {
                    return next(ApiError.NotFound("error-file-not-found"));
                }
            }
            case FileStorageType.S3: {
                if (file) {
                    const { bucket } = this.configService.get("minio", {
                        infer: true,
                    });
                    const stream = await this.minioClient.getObject(
                        bucket,
                        file.data,
                    );
                    res.setHeader("Content-Type", file.mimetype);
                    return stream.pipe(res);
                } else {
                    return next(ApiError.NotFound("error-file-not-found"));
                }
            }
        }
    }

    async getFileBuffer(id: string) {
        const file = await this.fileRepository.getById(id);

        switch (file.storageType) {
            case FileStorageType.DATABASE: {
                return Buffer.from(file.data, "base64");
            }
            case FileStorageType.S3: {
                if (!file) {
                    return null;
                }
                const { bucket } = this.configService.get("minio", {
                    infer: true,
                });
                const stream = await this.minioClient.getObject(
                    bucket,
                    file.data,
                );
                const chunks = [];
                for await (const chunk of stream) {
                    chunks.push(chunk);
                }
                return Buffer.concat(chunks);
            }
        }
    }

    async deleteById(user: User, id: string): Promise<File> {
        // TODO: Phân quyền xóa file, Log xóa file
        const res = await this.fileRepository.deleteOne({
            _id: id,
            author: user._id,
        });
        if (!res) {
            throw ApiError.NotFound("error-file-not-found");
        }
        return res;
    }

    async compressFiles() {
        const files = await this.fileRepository.getMany(
            {},
            { select: { data: 0 } },
        );
        const limit = pLimit(16);
        await Promise.all(
            files.map((file, index) =>
                limit(async () => {
                    console.log(
                        index + 1,
                        "/",
                        files.length,
                        file._id,
                        file.storageType,
                    );
                    const buffer = await this.getFileBuffer(file._id);
                    const compressData = await compressFile(buffer);
                    switch (file.storageType) {
                        case FileStorageType.DATABASE: {
                            await this.fileRepository.updateById(file._id, {
                                compressed: true,
                                data: compressData.buffer.toString("base64"),
                                size: compressData.buffer.byteLength,
                            });
                            break;
                        }
                        case FileStorageType.S3: {
                            const { bucket } = this.configService.get("minio", {
                                infer: true,
                            });
                            const filedata = await this.fileRepository
                                .getById(file._id, { select: { data: 1 } })
                                .then((item) => item?.data);
                            await this.minioClient.putObject(
                                bucket,
                                filedata,
                                compressData.buffer,
                                compressData.buffer.byteLength,
                                {
                                    filename: encodeURIComponent(file.name),
                                },
                            );
                            await this.fileRepository.updateById(file._id, {
                                compressed: true,
                                size: compressData.buffer.byteLength,
                            });
                        }
                    }
                }),
            ),
        );
    }

    async initiateMultipartUpload(
        user: User,
        body: ClientInitMultipartUploadDto,
    ): Promise<ClientInitMultipartUploadResponseDto> {
        const transaction = await this.transaction.startTransaction();
        try {
            const { bucket, multipartPartSize } = this.configService.get(
                "minio",
                {
                    infer: true,
                },
            );

            const totalPart = Math.ceil(body.size / multipartPartSize);
            const metadata = { "x-amz-meta-totalpart": totalPart.toString() };
            const data = `${Date.now()}_${v4()}_${StringUtil.normalizeFileName(
                body.filename,
            )}_${body.ext.toLowerCase()}`;
            const uploadId = await this.minioClient.initiateNewMultipartUpload(
                bucket,
                data,
                metadata,
            );
            const presignedUrls: ClientInitMultipartUploadResponseDto["presignedUrls"] =
                [];
            const limit = pLimit(16);
            await Promise.all(
                Array.from({ length: totalPart }, (_, i) => i).map((e) =>
                    limit(async () => {
                        const presignedUrl =
                            await this.minioClient.presignedUrl(
                                "PUT",
                                bucket,
                                data,
                                3600, // Expiry time in seconds
                                {
                                    partNumber: String(e + 1),
                                    uploadId,
                                } as PreSignRequestParams,
                            );
                        presignedUrls.push({ partNumber: e + 1, presignedUrl });
                    }),
                ),
            );

            const createFile: CreateDocument<File> = {
                authorName:
                    user?.fullname ||
                    [user?.lastname, user?.firstname].join(" "),
                author: user._id,
                data,
                name: body.filename,
                size: body.size,
                scope: body.scope,
                mimetype: body.mimetype,
                storageType: FileStorageType.S3,
                uploadId,
            };
            const fileManage = await this.fileRepository.create(createFile, {
                transaction,
            });
            await this.transaction.commitTransaction(transaction);
            return {
                multipartPartSize,
                presignedUrls,
                totalPart,
                fileId: fileManage._id,
            };
        } catch (err) {
            await this.transaction.abortTransaction(transaction);
            throw err;
        }
    }

    async clientCompleteMultipartUpload(
        user: User,
        body: ClientCompleteMultipartUploadDto,
    ) {
        const { bucket } = this.configService.get("minio", {
            infer: true,
        });
        const { parts } = body;
        const fileInfo = await this.fileRepository.getById(body.fileId);
        if (fileInfo) {
            await this.minioClient.completeMultipartUpload(
                bucket,
                fileInfo.data,
                fileInfo.uploadId,
                parts,
            );
            const url = await this.getUrl(fileInfo);
            fileInfo.data = undefined;
            return { file: fileInfo, url };
        } else {
            throw ApiError.BadRequest("error-file-not-found");
        }
    }

    async getFileInfo(user: User, id: string, req: Request) {
        const { file } = await this.accessFile(id, req);
        const url = await this.getUrl(file);
        delete file.data;
        Object.assign(file, { url });
        return file;
    }
}
