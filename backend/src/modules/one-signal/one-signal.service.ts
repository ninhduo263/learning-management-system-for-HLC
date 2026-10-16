import { QueueName } from "@common/constant";
import { AccessSsoJwtPayload } from "@module/auth/auth.interface";
import { AuthRepository } from "@module/auth/repository/auth-repository.interface";
import { NotificationReceiverType } from "@module/notification/common/constant";
import { Notification } from "@module/notification/entities/notification.entity";
import { UpdateOneSignalUserDto } from "@module/one-signal/dto/update-onesignal-user.dto";
import { OneSignalUserRepository } from "@module/one-signal/repository/one-signal-user-repository.interface";
import { Entity } from "@module/repository";
import { CreateDocument } from "@module/repository/common/base-repository.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { UserTopicRepository } from "@module/topic/repository/user-topic-repository.interface";
import { User } from "@module/user/entities/user.entity";
import { HttpService } from "@nestjs/axios";
import { InjectQueue } from "@nestjs/bull";
import { Injectable } from "@nestjs/common";
import { Queue } from "bull";
import { OneSignalApiService } from "./one-signal-api.service";

@Injectable()
export class OneSignalService {
    constructor(
        @InjectRepository(Entity.ONE_SIGNAL_USER)
        private readonly oneSignalUserRepository: OneSignalUserRepository,
        @InjectRepository(Entity.AUTH)
        private readonly authRepository: AuthRepository,
        @InjectRepository(Entity.USER_TOPIC)
        private readonly userTopicRepository: UserTopicRepository,
        @InjectQueue(QueueName.ONE_SIGNAL)
        private readonly oneSignalQueue: Queue,

        private readonly oneSignalApiService: OneSignalApiService,
        private readonly httpService: HttpService,
    ) {}

    async updateOneSignalUser(
        user: User,
        payload: AccessSsoJwtPayload,
        dto: UpdateOneSignalUserDto,
    ) {
        // const existId = await this.existPlayerId(dto.playerId);
        // // const authId = payload.sub.auth;
        // if (existId) {
        //     // const existAuth = await this.authRepository.getById(authId, {
        //     //     select: { exp: 1 },
        //     // });
        //     const inactiveAt = moment().add(1, "month").toDate();
        //     // if (existAuth) {
        //     await this.oneSignalUserRepository.updateOne(
        //         { playerId: dto.playerId },
        //         {
        //             auth: payload.sub.auth,
        //             user: user._id,
        //             inactiveAt,
        //             expireAt: new Date(existAuth.exp * 1000),
        //         },
        //         { upsert: true, new: true },
        //     );
        //     // } else {
        //     //     throw new NotFoundException();
        //     // }
        // }
    }

    async sendNotification(notification: CreateDocument<Notification>) {
        switch (notification.receiverType) {
            case NotificationReceiverType.TOPIC: {
                const userTopicBatch = this.userTopicRepository.getBatch(
                    {
                        "subscriptions.topic": { $in: notification.topics },
                    },
                    { limit: 2000, select: { user: 1 } },
                );
                while (true) {
                    const userTopicCursor = await userTopicBatch.next();
                    if (userTopicCursor.done) {
                        break;
                    }
                    const userIds = userTopicCursor.value.map((ut) => ut.user);
                    this.sendBatch({ user: { $in: userIds } }, notification);
                }
                break;
            }
            case NotificationReceiverType.USER: {
                while (true) {
                    this.sendBatch(
                        { user: { $in: notification.users } },
                        notification,
                    );
                    break;
                }
            }
        }
    }

    private async existPlayerId(id: string) {
        try {
            if (id) {
                const res = await this.oneSignalApiService.viewDevice(id);
                if (
                    res.status === 200 &&
                    res.data?.id === id &&
                    res.data?.invalid_identifier !== true
                ) {
                    return true;
                }
            }
            return false;
        } catch (err) {
            return false;
        }
    }

    private async sendBatch(
        oneSignalUserCondition: Record<string, unknown>,
        notification: CreateDocument<Notification>,
    ) {
        const sendAt = notification.createdAt || new Date();
        const oneSignalUserBatch = this.oneSignalUserRepository.getBatch(
            { ...oneSignalUserCondition, inactiveAt: { $gte: sendAt } },
            { limit: 2000, select: { playerId: 1 } },
        );

        while (true) {
            const oneSignalUserCursor = await oneSignalUserBatch.next();
            if (oneSignalUserCursor.done) {
                break;
            }
            const playerIds = oneSignalUserCursor.value.map((o) => o.playerId);
            await this.oneSignalQueue.add(
                "send-batch",
                {
                    playerIds,
                    notification,
                },
                { removeOnComplete: true, attempts: 5, delay: 100 },
            );
        }
        // TODO: Save inactive players logs, so that they will receive
        // notification when becoming active again
    }
}
