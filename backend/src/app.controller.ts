import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

@Controller("app")
@ApiTags("App")
export class AppController {
    @Get("timestamp")
    async getTimestamp() {
        const now = Date.now();
        return now;
    }
}
