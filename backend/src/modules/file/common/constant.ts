// import { fileTypeFromBuffer } from "file-type";
import fileType from "file-type";
import sharp from "sharp";

export enum FileStorageType {
    DATABASE = "Database",
    S3 = "S3",
}

export enum FileScope {
    PUBLIC = "Public",
    INTERNAL = "Internal",
    PRIVATE = "Private",
}

export const ALLOW_MIME_TYPES: {
    [key in "image" | "document" | "audio" | "data"]: Array<{
        ext: string;
        type: string;
    }>;
} = {
    image: [
        { ext: "webp", type: "image/webp" },
        { ext: "bmp", type: "image/bmp" },
        { ext: "jpg", type: "image/jpg" },
        { ext: "jpeg", type: "image/jpeg" },
        { ext: "png", type: "image/png" },
        { ext: "gif", type: "image/gif" },
    ],

    audio: [
        { ext: "mp3", type: "audio/mpeg" },
        { ext: "mp3", type: "audio/mp3" },
        { ext: "mp3", type: "audio/x-mp3" },
    ],

    document: [
        { ext: "txt", type: "text/plain" },
        { ext: "pdf", type: "application/pdf" },
        { ext: "doc", type: "application/msword" },
        {
            ext: "docx",
            type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        },
        {
            ext: "docx",
            type: "application/wps-office.docx",
        },
        { ext: "xls", type: "application/vnd.ms-excel" },
        {
            ext: "xlsx",
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
        {
            ext: "xlsx",
            type: "application/wps-office.xlsx",
        },
        { ext: "ppt", type: "application/vnd.ms-powerpoint" },
        {
            ext: "pptx",
            type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        },
    ],

    data: [],
};

ALLOW_MIME_TYPES.data = [
    ...ALLOW_MIME_TYPES.image,
    ...ALLOW_MIME_TYPES.document,
    ...ALLOW_MIME_TYPES.audio,
];

export type FileErrorCode =
    | "error-file-invalid-mimetype"
    | "error-file-not-found";

export const compressFile = async (buffer: Buffer) => {
    const fileTypeResult = await fileType.fromBuffer(buffer);
    const quality = Math.min(
        100,
        Math.max(Math.floor(((512 * 1024) / buffer.byteLength) * 100), 16),
    );
    if (quality < 100) {
        switch (fileTypeResult?.mime) {
            case "image/png":
            case "image/jpeg": {
                buffer = await sharp(buffer)
                    .toFormat("jpeg")
                    .jpeg({ quality })
                    .toBuffer();
                break;
            }
            case "image/webp": {
                buffer = await sharp(buffer)
                    .toFormat("webp")
                    .webp({ quality, alphaQuality: 80 })
                    .toBuffer();
                break;
            }
        }
    }
    return { buffer, fileType: fileTypeResult };
};
