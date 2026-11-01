import { Configuration } from "@config/configuration";
import { ModuleConfigFactory } from "@golevelup/nestjs-modules";
import { RabbitMQConfig } from "@golevelup/nestjs-rabbitmq";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RabbitMQExchange } from "./constant";

@Injectable()
export class RabbitMQConfigService
    implements ModuleConfigFactory<RabbitMQConfig>
{
    constructor(private readonly configService: ConfigService<Configuration>) {}
    createModuleConfig(): RabbitMQConfig {
        const { rabbitMQ } = this.configService.get("microservice", {
            infer: true,
        });
        return {
            uri: rabbitMQ.url,
            channels: {
                default: {
                    default: true,
                },
            },
            exchanges: [
                { type: "fanout", name: RabbitMQExchange.DEFAULT_FANOUT },
            ],
            connectionInitOptions: { wait: !Boolean(rabbitMQ.url) },
        };
    }
}
