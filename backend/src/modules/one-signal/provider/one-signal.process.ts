import { QueueName } from "@common/constant";
import { OneSignalSendBatchJob } from "@module/one-signal/interface/one-signal.interface";
import {
    OnQueueActive,
    OnQueueCompleted,
    OnQueueError,
    OnQueueFailed,
    Process,
    Processor,
} from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job } from "bull";
import { CreatePushOneSignalNotificationDto } from "../dto/create-push-onesignal-notification.dto";
import { OneSignalApiService } from "../one-signal-api.service";

@Processor(QueueName.ONE_SIGNAL)
export class OneSignalProcessor {
    private readonly logger = new Logger(OneSignalProcessor.name);

    constructor(private readonly oneSignalApiService: OneSignalApiService) {}

    @OnQueueActive()
    onActive(job: Job) {
        this.logger.verbose(`Processing job ${job.id} of type ${job.name}`);
    }

    @OnQueueCompleted()
    onCompleted(job: Job) {
        this.logger.verbose(`Completed job ${job.id} of type ${job.name}`);
    }

    @OnQueueError()
    onError(err: any) {
        this.logger.error(`Error job ${err}`);
    }

    @OnQueueFailed()
    onFailed(job: Job, error: Error) {
        this.logger.error(
            `Failed job ${job.id} of type ${job.name} with error: ${error.message}`,
        );
    }

    @Process("send-batch")
    async sendBatch(job: Job<OneSignalSendBatchJob>) {
        const { playerIds, notification } = job.data;
        const oneSignalNotification: CreatePushOneSignalNotificationDto = {
            include_player_ids: playerIds,
            headings: { en: notification.title },
            contents: { en: notification.content },
            adm_big_picture: notification.imageUrl,
            chrome_web_image: notification.imageUrl,
            data: notification.data,
        };
        if (notification.createdAt !== undefined) {
            Object.assign(oneSignalNotification, {
                send_after: notification.createdAt.toISOString(),
            });
        }
        const res = await this.oneSignalApiService.createNotification(
            oneSignalNotification,
        );
        this.logger.verbose(`${res.status} ${JSON.stringify(res.data)}`);
    }
}
