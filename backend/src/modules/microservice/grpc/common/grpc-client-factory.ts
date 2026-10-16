import { Configuration } from "@config/configuration";
import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
    ClientProvider,
    ClientsModuleOptionsFactory,
    ClientsProviderAsyncOptions,
    Transport,
} from "@nestjs/microservices";
import fs from "fs";
import path from "path";
import { getClientGrpcConfig } from "./constant";

const getGrpclientProvider = (module: string) => `${module}_grpc-client`;
export const InjectGrpcClient = (module: string) =>
    Inject(getGrpclientProvider(module));

export const GrpcClientFactory = (
    module: string,
): ClientsProviderAsyncOptions => {
    @Injectable()
    class GrpcClientConfigService implements ClientsModuleOptionsFactory {
        constructor(
            private readonly configService: ConfigService<Configuration>,
        ) {}
        createClientOptions(): ClientProvider {
            const rgpcConfig = getClientGrpcConfig(module);
            const config: ClientProvider = {
                transport: Transport.GRPC,
                options: {
                    package: rgpcConfig.packages,
                    protoPath: rgpcConfig.paths,
                    url: this.configService.get("microservice", {
                        infer: true,
                    }).gRPC.client[module]?.url,
                },
            };
            return config;
        }
    }
    return {
        name: getGrpclientProvider(module),
        useClass: GrpcClientConfigService,
    };
};

const rgpcClientModuleDirectory = path.join(__dirname, "../proto/client");

const RGPC_CLIENT_MODULE_NAME = fs
    .readdirSync(rgpcClientModuleDirectory, { withFileTypes: true })
    .filter((file) => {
        return file.isDirectory();
    })
    .map((file) => file.name);

export const RgpcClientModules = RGPC_CLIENT_MODULE_NAME.map((module) =>
    GrpcClientFactory(module),
);
