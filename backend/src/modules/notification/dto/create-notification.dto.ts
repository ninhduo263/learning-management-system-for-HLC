import { OmitType } from "@nestjs/swagger";
import { Notification } from "../entities/notification.entity";

export class CreateNotificationDto extends OmitType(Notification, ["_id"]) {}
