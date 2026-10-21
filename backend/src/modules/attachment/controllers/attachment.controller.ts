import { BaseControllerFactory } from "@config/controller/base-controller-factory";
import { CrudControllerConfig } from "@config/controller/crud-controller-config";
import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AttachmentConditionDto } from "../dto/attachment-condition.dto";
import { CreateAttachmentDto } from "../dto/create-attachment.dto";
import { UpdateAttachmentDto } from "../dto/update-attachment.dto";
import { Attachment } from "../entities/attachment.entity";
import { AttachmentService } from "../services/attachment.service";

@Controller("attachment")
@ApiTags("attachment")
export class AttachmentController extends BaseControllerFactory<Attachment>(
    Attachment,
    AttachmentConditionDto,
    CreateAttachmentDto,
    UpdateAttachmentDto,
    CrudControllerConfig(),
) {
    constructor(private readonly attachmentService: AttachmentService) {
        super(attachmentService);
    }
}
