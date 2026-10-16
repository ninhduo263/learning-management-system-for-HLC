import { Module } from "@nestjs/common";
import { WebSocketGatewayService } from "./websocket.gateway";
import { WebSocketController } from "./websocket.controller";
import { ConnectionManagerService } from "./services/connection-manager.service";

@Module({
    controllers: [WebSocketController],
    providers: [WebSocketGatewayService, ConnectionManagerService],
    exports: [ConnectionManagerService, WebSocketGatewayService],
})
export class WebSocketModule {}
