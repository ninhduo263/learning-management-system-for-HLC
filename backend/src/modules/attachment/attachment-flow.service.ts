import { Configuration } from "@config/configuration";
import { ApiError } from "@config/exception/api-error";
import { FileModel } from "@module/repository/sequelize/model/file.model";
import { User } from "@module/user/entities/user.entity";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/sequelize";
import { Transaction } from "sequelize";
import { AttachmentOwnerType } from "./common/constant";
import { AttachmentModel } from "./models/attachment.model";

export interface AttachmentView {
    _id: string;
    fileId: string;
    url: string;
    fileName: string;
    mimeType: string;
    fieldKey?: string;
}

/** Gắn file đã upload (POST /file) vào bản ghi nghiệp vụ */
@Injectable()
export class AttachmentFlowService {
    constructor(
        private readonly configService: ConfigService<Configuration>,
        @InjectModel(AttachmentModel)
        private readonly attachmentModel: typeof AttachmentModel,
        @InjectModel(FileModel) private readonly fileModel: typeof FileModel,
    ) {}

    fileUrl(fileId: string, fileName: string) {
        const address = this.configService.get("server.address", {
            infer: true,
        });
        return `${address}/file/${fileId}/${encodeURIComponent(fileName)}`;
    }

    /** Kiểm tra danh sách file tồn tại; trả về theo đúng thứ tự */
    async loadFiles(
        fileIds: string[],
        options: { requireImage?: boolean } = {},
    ) {
        const ids = [...new Set(fileIds ?? [])];
        if (!ids.length) return [];
        const files = await this.fileModel.findAll({
            where: { _id: ids },
            attributes: ["_id", "name", "mimetype", "size"],
            raw: true,
        });
        if (files.length !== ids.length)
            throw ApiError.BadRequest("error-file-not-found");
        if (
            options.requireImage &&
            !files.every((file) => String(file.mimetype).startsWith("image/"))
        ) {
            throw ApiError.BadRequest("error-file-invalid-mimetype");
        }
        return ids.map((id) => files.find((file) => file._id === id));
    }

    /** Thay toàn bộ file đính kèm của 1 bản ghi (theo fieldKey nếu có) */
    async replace(
        ownerType: AttachmentOwnerType,
        ownerId: string,
        fileIds: string[],
        user: Pick<User, "_id">,
        t: Transaction,
        fieldKey?: string,
    ) {
        const files = await this.loadFiles(fileIds);
        await this.attachmentModel.destroy({
            where: {
                ownerType,
                ownerId,
                ...(fieldKey !== undefined && { fieldKey }),
            },
            transaction: t,
        });
        if (!files.length) return;
        await this.attachmentModel.bulkCreate(
            files.map((file, index) => ({
                ownerType,
                ownerId,
                fieldKey,
                fileId: file._id,
                url: this.fileUrl(file._id, file.name),
                fileName: file.name,
                mimeType: file.mimetype,
                sortOrder: index,
                uploadedBy: user._id,
            })),
            { transaction: t },
        );
    }

    async removeAll(
        ownerType: AttachmentOwnerType,
        ownerId: string,
        t?: Transaction,
    ) {
        await this.attachmentModel.destroy({
            where: { ownerType, ownerId },
            transaction: t,
        });
    }

    /** ownerId -> danh sách file */
    async listFor(ownerType: AttachmentOwnerType, ownerIds: string[]) {
        const map = new Map<string, AttachmentView[]>();
        if (!ownerIds.length) return map;
        const rows = await this.attachmentModel.findAll({
            where: { ownerType, ownerId: ownerIds },
            order: [["sortOrder", "ASC"]],
            raw: true,
        });
        for (const row of rows) {
            const list = map.get(row.ownerId) ?? [];
            list.push({
                _id: row._id,
                fileId: row.fileId,
                url: row.url,
                fileName: row.fileName,
                mimeType: row.mimeType,
                fieldKey: row.fieldKey ?? undefined,
            });
            map.set(row.ownerId, list);
        }
        return map;
    }
}
