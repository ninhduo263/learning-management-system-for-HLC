import { OmitType } from "@nestjs/swagger";
import { Attachment } from "../entities/attachment.entity";

export class CreateAttachmentDto extends OmitType(Attachment, ["_id"]) {}
