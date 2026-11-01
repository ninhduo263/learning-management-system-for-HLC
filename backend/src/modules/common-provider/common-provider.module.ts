import { Global, Module } from "@nestjs/common";
import { CommonProviderService } from "./common-provider.service";

@Global()
@Module({
    providers: [CommonProviderService],
    exports: [CommonProviderService],
})
export class CommonProviderModule {}
