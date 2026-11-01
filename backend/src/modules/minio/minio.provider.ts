import { Inject, Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client } from "minio";
import { Configuration } from "../../config/configuration";

const MINIO_CLIENT = "MINIO_CLIENT";
export const InjectMinioClient = () => Inject(MINIO_CLIENT);
export type MinioClient = Client;

export const MinioClientProviders: Provider[] = [
    {
        provide: MINIO_CLIENT,
        useFactory: async (configService: ConfigService<Configuration>) => {
            const {
                endPoint,
                port,
                useSsl: useSSL,
                accessKey,
                secretKey,
                region,
            } = configService.get("minio", { infer: true });
            const client = new Client({
                endPoint,
                port,
                useSSL,
                accessKey,
                secretKey,
                region,
            });
            return client;
        },
        inject: [ConfigService],
    },
];
