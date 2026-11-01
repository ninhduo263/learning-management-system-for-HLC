import { Controller } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { ApiTags } from "@nestjs/swagger";
import { MicroserviceService } from "./microservice.service";

@Controller("microservice")
@ApiTags("microservice")
export class MicroserviceController {
    constructor(private readonly microserviceSerice: MicroserviceService) {}

    @GrpcMethod(MicroserviceService.name)
    helloWorld() {
        return { message: "Hello World!" };
    }
}
