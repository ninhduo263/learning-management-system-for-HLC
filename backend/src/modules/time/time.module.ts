import { Global, Module } from "@nestjs/common";
import { TimeController } from "./time.controller";
import { TimeService } from "./time.service";

@Global()
@Module({
    providers: [TimeService],
    controllers: [TimeController],
    exports: [TimeService],
})
export class TimeModule {}
