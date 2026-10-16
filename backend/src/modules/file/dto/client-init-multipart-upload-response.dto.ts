import { MultipartPresignedUrlDataDto } from "./mutipart-presigned-url-data.dto";

export class ClientInitMultipartUploadResponseDto {
    multipartPartSize: number;

    totalPart: number;

    presignedUrls: MultipartPresignedUrlDataDto[];

    fileId: string;
}
