import { Injectable } from "@nestjs/common";
import { ClientGrpc } from "@nestjs/microservices";
import { InjectGrpcClient } from "./grpc/common/grpc-client-factory";

@Injectable()
export class MicroserviceService {
    constructor(
        @InjectGrpcClient("local")
        private localGrpcClient: ClientGrpc,
    ) {}

    serverHelloWorld() {
        return { message: "Hello World!" };
    }

    async clientHelloWorld() {
        const service = this.localGrpcClient.getService<any>(
            "MicroserviceService",
        );
        return service.helloWorld(null);
    }
}
