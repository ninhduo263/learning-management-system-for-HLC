import { File } from "../entities/file.entity";

export class CreateFileResponseDto {
    file: File;
    url: string;
}
