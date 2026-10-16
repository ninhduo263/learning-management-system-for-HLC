import { IsNumber, IsString } from "class-validator";

export class MultipartPresignedUrlDataDto {
    @IsNumber()
    partNumber: number;

    @IsString()
    presignedUrl: string;
}
