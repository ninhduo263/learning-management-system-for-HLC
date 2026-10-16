import { FileStorageType } from "@module/file/common/constant";
import { TcpClients } from "@module/microservice/tcp/tcp-client.provider";
import { Logger } from "@nestjs/common";
import { Region } from "minio";

const logger = new Logger("Configuration");

export const getEnv = (key: string, defaultValue?: string): string => {
    let value = process.env[key];
    if (value === undefined) {
        const message = [`${key} empty`];
        if (defaultValue !== undefined) {
            message.push(`use default: ${defaultValue}`);
            value = defaultValue;
        }
        logger.warn(message.join(", "));
    }
    return value;
};

export enum Environment {
    PRODUCTION = "production",
    STAGING = "staging",
    DEVELOPMENT = "development",
}

export interface Configuration {
    server: {
        env: Environment;
        port: number;
        address: string;
        documentPath: string;
        defaultAdminUsername: string;
        microserviceDocumentPath: string;
        defaultAdminPassword: string;
        defaultFileStorage: FileStorageType;
        gwAddress: string;
        gwApiKey: string;
        master: "0" | "1";
    };
    microservice: {
        gRPC: {
            url: string;
            client: { [module: string]: { url: string } };
        };
        tcp: {
            host: string;
            port: number;
            client: {
                [module in (typeof TcpClients)[number]]: {
                    host: string;
                    port: number;
                };
            };
        };
        rabbitMQ: {
            url: string;
        };
    };
    jwt: {
        secret: string;
        exp: number;
        refreshSecret: string;
        refreshExp: number;
    };
    mongodb: {
        uri: string;
        host?: string;
        port?: number;
        username?: string;
        password?: string;
        name?: string;
    };
    sql: {
        type: string;
        host: string;
        port: number;
        username: string;
        password: string;
        schema: string;
        database: string;
        maxPool: number;
    };
    redis: {
        host: string;
        port: number;
        password: string;
    };
    oneSignal: {
        appId: string;
        apiKey: string;
    };
    sso: {
        jwksUri: string;
        usernameField: string;
        emailField: string;
        firstNameField: string;
        lastNameField: string;
    };
    sentry: {
        dsn: string;
    };
    minio: {
        endPoint: string;
        port: number;
        useSsl: boolean;
        address: string;
        accessKey: string;
        secretKey: string;
        region: Region;
        bucket: string;
        multipartPartSize: number;
    };
}

export default (): Configuration => {
    const serverPort = Number(getEnv("SERVER_PORT")) || 3000;
    const server: Configuration["server"] = {
        env: getEnv("SERVER_ENV", Environment.DEVELOPMENT) as Environment,
        address: getEnv("SERVER_ADDRESS", `http://localhost:${serverPort}`),
        port: serverPort,
        documentPath: getEnv("SERVER_DOCUMENT_PATH", "api"),
        defaultAdminUsername: getEnv("SERVER_DEFAULT_ADMIN_PASSWORD", "admin"),
        microserviceDocumentPath: getEnv(
            "SERVER_MICROSERVICE_DOCUMENT_PATH",
            "microservice/api",
        ),
        defaultAdminPassword: getEnv("SERVER_DEFAULT_ADMIN_PASSWORD", "admin"),
        defaultFileStorage: getEnv(
            "SEVER_DEFAULT_FILE_STORAGE",
            "Database",
        ) as FileStorageType,
        gwAddress: getEnv("SERVER_GW_ADDRESS"),
        gwApiKey: getEnv("SERVER_GW_API_KEY"),
        master: getEnv("SERVER_MASTER", "0") === "1" ? "1" : "0",
    };

    const microserviceGrpcHost = getEnv("MICROSERVICE_GRPC_HOST", "0.0.0.0");
    const microserviceGrpcPort = getEnv("MICROSERVICE_GRPC_PORT", "3001");

    const microserviceTcpHost = getEnv("MICROSERVICE_TCP_HOST", "0.0.0.0");
    const microserviceTcpPort = Number(getEnv("MICROSERVICE_TCP_PORT", "3002"));

    // Modify to local in core app
    const microserviceTcpHostCore = getEnv("MICROSERVICE_TCP_HOST_CORE");
    const microserviceTcpPortCore = Number(
        getEnv("MICROSERVICE_TCP_PORT_CORE"),
    );

    const microservice: Configuration["microservice"] = {
        gRPC: {
            url: `${microserviceGrpcHost}:${microserviceGrpcPort}`,
            client: {
                local: {
                    url: `localhost:${microserviceGrpcPort}`,
                },
            },
        },
        tcp: {
            host: microserviceTcpHost,
            port: microserviceTcpPort,
            client: {
                local: {
                    host: microserviceTcpHost,
                    port: microserviceTcpPort,
                },
                core: {
                    host: microserviceTcpHostCore,
                    port: microserviceTcpPortCore,
                },
            },
        },
        rabbitMQ: {
            url: getEnv("MICROSERVICE_RABBITMQ_URL"),
        },
    };

    const jwt: Configuration["jwt"] = {
        secret: getEnv("JWT_SECRET"),
        exp: Number(getEnv("JWT_EXP")) || undefined,
        refreshSecret: getEnv("JWT_REFRESH_SECRET"),
        refreshExp: Number(getEnv("JWT_REFRESH_EXP")) || undefined,
    };

    const mongodb: Configuration["mongodb"] = {
        uri: getEnv("MONGODB_URI") || getEnv("DB_URI"),
    };
    if (!mongodb.uri) {
        mongodb.host = getEnv("MONGODB_HOST", "localhost");
        mongodb.port = Number(getEnv("MONGODB_PORT"));
        mongodb.name = getEnv("MONGODB_NAME");
        mongodb.username = getEnv("MONGODB_USER");
        mongodb.password = getEnv("MONGODB_PASSWORD");
    }

    const sql: Configuration["sql"] = {
        type: getEnv("SQL_TYPE", "postgres"),
        host: getEnv("SQL_HOST"),
        port: Number(getEnv("SQL_PORT")),
        username: getEnv("SQL_USER"),
        password: getEnv("SQL_PASSWORD"),
        schema: getEnv("SQL_SCHEMA"),
        database: getEnv("SQL_DB"),
        maxPool: Number(getEnv("SQL_DB_MAX_POOL", "5")),
    };

    const redis: Configuration["redis"] = {
        host: getEnv("REDIS_HOST"),
        port: Number(getEnv("REDIS_PORT")),
        password: getEnv("REDIS_PASSWORD"),
    };

    const oneSignal: Configuration["oneSignal"] = {
        appId: getEnv("ONE_SIGNAL_APP_ID"),
        apiKey: getEnv("ONE_SIGNAL_API_KEY"),
    };

    const sso: Configuration["sso"] = {
        jwksUri: getEnv("SSO_JWKS_URI"),
        usernameField: getEnv("SSO_USERNAME_FIELD", "preferred_username"),
        emailField: getEnv("SSO_EMAIL_FIELD", "email"),
        firstNameField: getEnv("SSO_EMAIL_FIELD", "given_name"),
        lastNameField: getEnv("SSO_EMAIL_FIELD", "family_name"),
    };
    const sentry: Configuration["sentry"] = {
        dsn: getEnv("SENTRY_DSN"),
    };

    const minio: Configuration["minio"] = {
        endPoint: getEnv("MINIO_ENDPOINT", "localhost"),
        port: Number(getEnv("MINIO_PORT")),
        useSsl: getEnv("MINIO_USE_SSL", "1") === "1",
        address: getEnv("MINIO_ADDRESS"),
        accessKey: getEnv("MINIO_ACCESS_KEY"),
        secretKey: getEnv("MINIO_SECRET_KEY"),
        region: getEnv("MINIO_REGION"),
        bucket: getEnv("MINIO_BUCKET"),
        multipartPartSize: Number(
            getEnv("MINIO_MULTIPART_PART_SIZE", "16777216"),
        ),
    };

    return {
        server,
        microservice,
        jwt,
        mongodb,
        sql,
        redis,
        oneSignal,
        sso,
        sentry,
        minio,
    };
};
