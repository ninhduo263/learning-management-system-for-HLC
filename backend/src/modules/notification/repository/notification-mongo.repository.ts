import { NotificationRepository } from "@module/notification/repository/notification-repository.interface";
import { Entity } from "@module/repository";
import { MongoRepository } from "@module/repository/mongo/mongo.repository";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Notification } from "../entities/notification.entity";

export class NotificationMongoRepository
    extends MongoRepository<Notification>
    implements NotificationRepository
{
    constructor(
        @InjectModel(Entity.NOTIFICATION)
        private readonly notificationModel: Model<Notification>,
    ) {
        super(notificationModel);
    }
}
