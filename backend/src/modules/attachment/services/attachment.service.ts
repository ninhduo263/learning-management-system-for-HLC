import { BaseService } from "@config/service/base.service";
import { Entity } from "@module/repository";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { InjectTransaction } from "@module/repository/common/transaction";
import { Injectable } from "@nestjs/common";
import { Attachment } from "../entities/attachment.entity";
import { AttachmentRepository } from "../repositories/attachment-repository.interface";

@Injectable()
export class AttachmentService extends BaseService<
    Attachment,
    AttachmentRepository
> {
    constructor(
        @InjectRepository(Entity.ATTACHMENT)
        private readonly attachmentRepository: AttachmentRepository,
        @InjectTransaction()
        private readonly attachmentTransaction: BaseTransaction,
    ) {
        super(attachmentRepository, {
            notFoundCode: "error-record-not-found",
            transaction: attachmentTransaction,
        });
    }
}
