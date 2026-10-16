import { Module } from "@nestjs/common";
import { DataProcessService } from "./data-process.service";
import { DataProcessController } from "./data-process.controller";

@Module({
    providers: [DataProcessService],
    controllers: [DataProcessController],
})
export class DataProcessModule {}
