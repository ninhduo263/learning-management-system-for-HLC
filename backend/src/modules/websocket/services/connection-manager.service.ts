import { Injectable, Logger } from "@nestjs/common";
import { Socket } from "socket.io";

@Injectable()
export class ConnectionManagerService {
    private readonly logger = new Logger(ConnectionManagerService.name);

    // Kết nối WebSocket theo kiosk_id
    private activeConnections: Map<string, Socket> = new Map();

    // Ánh xạ device_id -> kiosk_id
    private deviceToKiosk: Map<string, string> = new Map();

    updateConnection(socket: Socket, kioskId: string): void {
        this.activeConnections.set(kioskId, socket);
        this.logger.log(`Updated connection for kiosk_id: ${kioskId}`);
    }

    registerDevice(kioskId: string, deviceId: string): void {
        this.deviceToKiosk.set(deviceId, kioskId);
        this.logger.log(`Registered device ${deviceId} with kiosk ${kioskId}`);
    }

    getKioskForDevice(deviceId: string): string | undefined {
        return this.deviceToKiosk.get(deviceId);
    }

    async sendJson(data: any, kioskId: string): Promise<void> {
        const socket = this.activeConnections.get(kioskId);
        if (socket) {
            socket.emit("message", data);
            this.logger.debug(`Sent data to kiosk ${kioskId}`);
        } else {
            this.logger.warn(`No active connection for kiosk ${kioskId}`);
        }
    }

    async sendResponse(data: any, deviceId: string): Promise<void> {
        const kioskId = this.getKioskForDevice(deviceId);
        if (kioskId) {
            await this.sendJson(data, kioskId);
        } else {
            this.logger.warn(`No kiosk found for device ${deviceId}`);
        }
    }

    disconnect(socket: Socket): void {
        // Tìm kiosk_id có socket này
        let kioskToRemove: string | null = null;
        for (const [kioskId, ws] of this.activeConnections.entries()) {
            if (ws.id === socket.id) {
                kioskToRemove = kioskId;
                break;
            }
        }

        if (kioskToRemove) {
            this.activeConnections.delete(kioskToRemove);
            this.logger.log(`Disconnected kiosk ${kioskToRemove}`);

            // Xóa các ánh xạ device -> kiosk
            for (const [deviceId, kId] of this.deviceToKiosk.entries()) {
                if (kId === kioskToRemove) {
                    this.deviceToKiosk.delete(deviceId);
                    this.logger.log(`Unregistered device ${deviceId}`);
                }
            }
        }
    }

    getActiveConnections(): Map<string, Socket> {
        return this.activeConnections;
    }

    getDeviceToKioskMapping(): Map<string, string> {
        return this.deviceToKiosk;
    }
}
