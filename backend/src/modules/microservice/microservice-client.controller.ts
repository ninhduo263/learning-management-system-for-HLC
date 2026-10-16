import {
    AllowSystemRoles,
    Authorization,
} from "@common/decorator/auth.decorator";
import { SystemRole } from "@module/user/common/constant";
import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { MicroserviceService } from "./microservice.service";

@Controller("microservice/client")
@ApiTags("microservice")
@Authorization()
export class MicroserviceClientController {
    constructor(private readonly microserviceSerice: MicroserviceService) {}

    @AllowSystemRoles(SystemRole.ADMIN)
    @Get("hello-world")
    async clientHelloWorld() {
        return this.microserviceSerice.clientHelloWorld();
    }
}
