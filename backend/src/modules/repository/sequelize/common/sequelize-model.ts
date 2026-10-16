import { EventAccount } from "@module/event-account/entities/event-account.entity";
import { Event } from "@module/event/entities/event.entity";
import { EventLog } from "@module/event-log/entities/event-log.entity";
import { HamSinhMaModel } from "@module/quy-tac-ma/models/ham-sinh-ma.model";
import { QuyTacMaModel } from "@module/quy-tac-ma/models/quy-tac-ma.model";
import { Model, ModelCtor } from "sequelize-typescript";
import { AuditLogModel } from "../model/audit-log.model";
import { AuthModel } from "../model/auth.model";
import { DataPartitionUserModel } from "../model/data-partition-user.model";
import { DataPartitionModel } from "../model/data-partition.model";
import { FileModel } from "../model/file.model";
import { IncrementModel } from "../model/increment.model";
import { NotificationModel } from "../model/notification.model";
import { OneSignalUserModel } from "../model/one-signal-user.model";
import { SettingModel } from "../model/setting.model";
import TopicModel from "../model/topic.model";
import { UserTopicModel } from "../model/user-topic.model";
import { UserModel } from "../model/user.model";

export const SequelizeModel: ModelCtor<Model>[] = [
    UserModel,
    AuthModel,
    Event,
    EventAccount,
    EventLog,
    FileModel,
    NotificationModel,
    OneSignalUserModel,
    TopicModel,
    UserTopicModel,
    SettingModel,
    IncrementModel,
    QuyTacMaModel,
    HamSinhMaModel,
    AuditLogModel,
    DataPartitionModel,
    DataPartitionUserModel,
];
