import { Notification } from "@module/notification/entities/notification.entity";
import { CreateDocument } from "@module/repository/common/base-repository.interface";

export interface OneSignalSendBatchJob {
    playerIds: string[];
    notification: CreateDocument<Notification>;
}
