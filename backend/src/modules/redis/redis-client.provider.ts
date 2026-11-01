import { Inject, Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

const REDIS_CLIENT = "REDIS_CLIENT";
export const InjectRedisClient = () => Inject(REDIS_CLIENT);

export const RedisClientProvider: Provider = {
    provide: REDIS_CLIENT,
    inject: [ConfigService],
    useFactory: (configService: ConfigService) => {
        const { host, port, password } = configService.get("redis");
        const redis = new Redis(port, host, {
            password,
        });
        return redis;
    },
};
