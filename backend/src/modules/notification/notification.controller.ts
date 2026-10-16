import { ApiRecordResponse } from "@common/decorator/api.decorator";
import { Authorization, ReqUser } from "@common/decorator/auth.decorator";
import { CreateNotificationDto } from "@module/notification/dto/create-notification.dto";
import { NotificationService } from "@module/notification/notification.service";
import { User } from "@module/user/entities/user.entity";
import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Notification } from "./entities/notification.entity";

@Controller("notification")
@ApiTags("notification")
@Authorization()
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) {}

    @ApiRecordResponse(Notification)
    @Post()
    async create(@ReqUser() user: User, @Body() dto: CreateNotificationDto) {
        return this.notificationService.createNotification(user, dto);
    }
}
