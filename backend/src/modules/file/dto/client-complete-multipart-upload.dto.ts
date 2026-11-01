import { Allow, IsString } from "class-validator";

export class ClientCompleteMultipartUploadDto {
    @IsString()
    fileId: string;

    @Allow()
    parts: {
        etag: string;
        part: number;
    }[];
}
