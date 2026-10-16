import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Configuration } from "src/config/configuration";
import { InjectMinioClient, MinioClient } from "./minio.provider";

@Injectable()
export class MinioService implements OnModuleInit {
    private readonly logger: Logger = new Logger(MinioService.name);
    constructor(
        private readonly configService: ConfigService<Configuration>,
        @InjectMinioClient()
        private readonly minioClient: MinioClient,
    ) {}
    async onModuleInit() {
        await this.initFileUploadBuckets();
    }

    async initFileUploadBuckets() {
        const { region, bucket } = this.configService.get("minio", {
            infer: true,
        });
        try {
            const exists = await this.minioClient.bucketExists(bucket);
            if (exists) {
                this.logger.warn(`Bucket "${bucket}" initialized`);
            } else {
                await this.minioClient.makeBucket(bucket, region);
                this.logger.verbose(`Bucket "${bucket}" created`);
            }
        } catch (err) {
            this.logger.warn(
                `Error initializing bucket "${bucket}": ${err as string}`,
            );
        }
    }
}
