import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { Attachment } from "../entities/attachment.entity";
import { AttachmentModel } from "../models/attachment.model";
import { AttachmentRepository } from "./attachment-repository.interface";

export class AttachmentSqlRepository
    extends SqlRepository<Attachment>
    implements AttachmentRepository
{
    constructor(
        @InjectModel(AttachmentModel)
        private readonly attachmentModel: typeof AttachmentModel,
    ) {
        super(attachmentModel);
    }
}
