import { Configuration } from "@config/configuration";
import { Inject, Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ClientProxyFactory, Transport } from "@nestjs/microservices";

export const getTcpClientToken = (name: string) => `${name}TcpClient`;

export const TcpClients = ["local", "core"] as const;

export const TcpClientProviders = TcpClients.map(
    (name: string): Provider => ({
        provide: getTcpClientToken(name),
        inject: [ConfigService],
        useFactory: async (configService: ConfigService<Configuration>) => {
            const client = configService.get("microservice.tcp.client", {
                infer: true,
            })[name];
            if (!client) {
                throw new Error(`TCP client "${name}" not found`);
            }
            const clientProxy = ClientProxyFactory.create({
                transport: Transport.TCP,
                options: {
                    host: client.host,
                    port: client.port,
                },
            });
            return clientProxy;
        },
    }),
);

export const InjectTcpClient = (name: (typeof TcpClients)[number]) =>
    Inject(getTcpClientToken(name));
