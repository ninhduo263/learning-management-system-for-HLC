import { Global, Module } from "@nestjs/common";
import { RedisClientProvider } from "./redis-client.provider";

@Global()
@Module({
    providers: [RedisClientProvider],
    exports: [RedisClientProvider],
})
export class RedisModule {}
