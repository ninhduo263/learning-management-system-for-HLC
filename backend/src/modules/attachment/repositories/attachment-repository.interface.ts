import { BaseRepository } from "@module/repository/common/base-repository.interface";
import { Attachment } from "../entities/attachment.entity";

export interface AttachmentRepository extends BaseRepository<Attachment> {}
