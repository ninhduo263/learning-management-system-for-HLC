import { NotificationRepository } from "@module/notification/repository/notification-repository.interface";
import { OneSignalService } from "@module/one-signal/one-signal.service";
import { Entity } from "@module/repository";
import { CreateDocument } from "@module/repository/common/base-repository.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { User } from "@module/user/entities/user.entity";
import { Injectable } from "@nestjs/common";
import { Notification } from "./entities/notification.entity";

@Injectable()
export class NotificationService {
    constructor(
        @InjectRepository(Entity.NOTIFICATION)
        private readonly notificationRepository: NotificationRepository,

        private readonly oneSignalService: OneSignalService,
    ) {}

    async createNotification(user: User, dto: CreateDocument<Notification>) {
        dto.senderName = user.fullname;
        dto.sender = user._id;
        const res = await this.notificationRepository.create(dto);
        this.oneSignalService.sendNotification(dto);
        return res;
    }
}
