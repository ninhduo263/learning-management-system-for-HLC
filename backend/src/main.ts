import { Sentry } from "@common/constant";
import { Configuration } from "@config/configuration";
import { TcpSocket } from "@config/tcp/tcp-socket";
import { getServerGrpcConfig } from "@module/microservice/grpc/common/constant";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { GrpcOptions, TcpOptions, Transport } from "@nestjs/microservices";
import { NestExpressApplication } from "@nestjs/platform-express";
import {
    DocumentBuilder,
    SwaggerCustomOptions,
    SwaggerModule,
} from "@nestjs/swagger";
import { json, urlencoded } from "body-parser";
import { I18nMiddleware } from "nestjs-i18n";
import "reflect-metadata";
import { AppModule } from "./app.module";

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    app.set("query parser", "extended");
    const configService = app.get(ConfigService<Configuration>);
    app.use(I18nMiddleware);

    const { dsn } = configService.get("sentry", { infer: true });
    Sentry.init({ dsn });

    const {
        port,
        documentPath,
        address: serverAddress,
        gwAddress: serverGwAddress,
    } = configService.get("server", {
        infer: true,
    });

    const { gRPC, tcp } = configService.get("microservice", {
        infer: true,
    });

    const swaggerMainConfig = new DocumentBuilder()
        .addServer(serverAddress, "Server")
        .addServer(`http://localhost:${port}`, "Local")
        .addApiKey(
            { type: "apiKey", name: "x-data-partition-code", in: "header" },
            "dataPartitionCode",
        )
        .addApiKey(
            {
                type: "apiKey",
                name: "x-api-key",
                in: "header",
            },
            "apiKey",
        )
        .addApiKey(
            {
                type: "apiKey",
                name: "x-gw-api-key",
                in: "header",
            },
            "gwApiKey",
        )
        .addBearerAuth()
        .build();

    const swaggerInternalConfig = new DocumentBuilder()
        .addServer(serverGwAddress || serverAddress, "Server")
        .addServer(`http://localhost:${port}`, "Local")
        .addApiKey(
            {
                type: "apiKey",
                name: "x-api-key",
                in: "header",
            },
            "apiKey",
        )
        .addApiKey(
            {
                type: "apiKey",
                name: "x-gw-api-key",
                in: "header",
            },
            "gwApiKey",
        )
        .build();

    const mainDocument = SwaggerModule.createDocument(app, swaggerMainConfig);
    const swaggerCustomOptions: SwaggerCustomOptions = {
        swaggerOptions: {
            docExpansion: "none",
            defaultModelsExpandDepth: -1,
            displayRequestDuration: true,
            filter: true,
            operationsSorter: (a: any, b: any) => {
                const order: { [field: string]: number } = {
                    get: 0,
                    post: 1,
                    put: 2,
                    patch: 3,
                    delete: 4,
                };
                const [pathA, methodA]: [string, string] = [
                    a._root.entries[0][1],
                    a._root.entries[1][1],
                ];

                const [pathB, methodB]: [string, string] = [
                    b._root.entries[0][1],
                    b._root.entries[1][1],
                ];
                return (
                    `${pathA}/`.localeCompare(`${pathB}/`) ||
                    order[methodA] - order[methodB] ||
                    0
                );
            },
            plugins: [
                () => {
                    return {
                        fn: {
                            opsFilter: (taggedOps: any, phrase: string) => {
                                return taggedOps.filter(
                                    (_: unknown, tag: string) => {
                                        return tag
                                            .toLowerCase()
                                            .includes(phrase.toLowerCase());
                                    },
                                );
                            },
                        },
                    };
                },
            ],
        },
    };
    SwaggerModule.setup(documentPath, app, mainDocument, swaggerCustomOptions);

    const internalDocument = SwaggerModule.createDocument(
        app,
        swaggerInternalConfig,
    );

    internalDocument.paths = Object.entries(internalDocument.paths)
        .filter((item) => item[0].startsWith("/internal/"))
        .reduce(
            (paths, item) => Object.assign(paths, { [item[0]]: item[1] }),
            {},
        );
    SwaggerModule.setup(
        "internal/document",
        app,
        internalDocument,
        swaggerCustomOptions,
    );

    app.enableCors();
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidUnknownValues: false,
        }),
    );

    app.use(json({ limit: "50mb" }));
    app.use(urlencoded({ limit: "50mb", extended: true }));

    const protoConfig = getServerGrpcConfig();

    app.connectMicroservice<GrpcOptions>({
        transport: Transport.GRPC,
        options: {
            package: protoConfig.packages,
            protoPath: protoConfig.paths,
            url: gRPC.url,
        },
    });

    app.connectMicroservice<TcpOptions>({
        transport: Transport.TCP,
        options: {
            host: tcp.host,
            port: tcp.port,
            retryAttempts: 5,
            retryDelay: 64,
            socketClass: TcpSocket,
        },
    });
    await app.startAllMicroservices();
    await app.listen(port);
}
bootstrap();
