import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";
import { ConnectionManagerService } from "./services/connection-manager.service";

@WebSocketGateway({
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
    namespace: "/",
})
export class WebSocketGatewayService
    implements OnGatewayConnection, OnGatewayDisconnect
{
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(WebSocketGatewayService.name);

    constructor(private readonly connectionManager: ConnectionManagerService) {}

    async handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);

        // Gửi thông báo kết nối thành công
        client.emit("connection", {
            success: true,
            message: "Kết nối WebSocket thành công",
        });
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
        this.connectionManager.disconnect(client);
    }

    @SubscribeMessage("register_kiosk")
    handleRegisterKiosk(
        @MessageBody() data: { kiosk_id: string },
        @ConnectedSocket() client: Socket,
    ) {
        const { kiosk_id } = data;
        this.connectionManager.updateConnection(client, kiosk_id);

        client.emit("kiosk_registered", {
            success: true,
            message: `Kiosk ${kiosk_id} đã được đăng ký thành công`,
        });
    }

    @SubscribeMessage("device_id")
    handleDeviceId(
        @MessageBody() deviceId: string,
        @ConnectedSocket() client: Socket,
    ) {
        this.logger.log(`Kết nối WebSocket mới với device_id: ${deviceId}`);
        this.connectionManager.updateConnection(client, deviceId);

        client.emit("device_registered", {
            success: true,
            message: `Device ${deviceId} đã được đăng ký thành công`,
        });
    }

    @SubscribeMessage("webcam_data")
    async handleWebcamData(
        @MessageBody() data: any,
        @ConnectedSocket() client: Socket,
    ) {
        try {
            // Xử lý dữ liệu webcam (tương tự như predict function trong FastAPI)
            // Bạn có thể implement logic xử lý face recognition ở đây

            const result = {
                success: true,
                event: "webcam",
                payload: {
                    message: "Dữ liệu webcam đã được xử lý",
                    data,
                },
            };

            client.emit("webcam_result", result);
        } catch (error) {
            this.logger.error("Error processing webcam data:", error);
            client.emit("error", {
                success: false,
                message: "Lỗi xử lý dữ liệu webcam",
            });
        }
    }

    @SubscribeMessage("ping")
    handlePing(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
        client.emit("pong", {
            success: true,
            message: "pong",
            timestamp: new Date().toISOString(),
        });
    }
}
