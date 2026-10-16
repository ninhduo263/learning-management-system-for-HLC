import { Configuration } from "@config/configuration";
import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { lastValueFrom } from "rxjs";
import { CreatePushOneSignalNotificationDto } from "./dto/create-push-onesignal-notification.dto";

const API_URL = "https://onesignal.com/api/v1";

@Injectable()
export class OneSignalApiService {
    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService<Configuration>,
    ) {}

    private getHeaders(headers: Record<string, any> = {}) {
        const { apiKey } = this.configService.get("oneSignal", { infer: true });
        return Object.assign(headers, { Authorization: apiKey });
    }

    private getBody(body: Record<string, any>) {
        const { appId } = this.configService.get("oneSignal", { infer: true });
        return Object.assign(body, { app_id: appId });
    }

    private getQuery(query: Record<string, any> = {}) {
        const { appId } = this.configService.get("oneSignal", { infer: true });
        return Object.assign(query, { app_id: appId });
    }

    async viewDevice(playerId: string) {
        return lastValueFrom(
            this.httpService.get(`${API_URL}/players/${playerId}`, {
                headers: this.getHeaders(),
                params: this.getQuery(),
            }),
        );
    }

    async createNotification(dto: CreatePushOneSignalNotificationDto) {
        return lastValueFrom(
            this.httpService.post(
                `${API_URL}/notifications`,
                this.getBody(dto),
                {
                    headers: this.getHeaders(),
                },
            ),
        );
    }
}
