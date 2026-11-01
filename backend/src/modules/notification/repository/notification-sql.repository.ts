import { NotificationModel } from "@module/repository/sequelize/model/notification.model";
import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { ModelCtor } from "sequelize-typescript";
import { Notification } from "../entities/notification.entity";
import { NotificationRepository } from "./notification-repository.interface";

export class NotificationSqlRepository
    extends SqlRepository<Notification>
    implements NotificationRepository
{
    constructor(
        @InjectModel(NotificationModel)
        private readonly notificationModel: ModelCtor<NotificationModel>,
    ) {
        super(notificationModel);
    }
}
