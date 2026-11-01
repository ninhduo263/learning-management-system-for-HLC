import { PartialType } from "@nestjs/swagger";
import { Attachment } from "../entities/attachment.entity";

export class AttachmentConditionDto extends PartialType(Attachment) {}
