import { ArgumentMetadata, PipeTransform } from "@nestjs/common";
import { CreateFileDto } from "../dto/create-file.dto.js";

export class FileUploadTransform
    implements PipeTransform<CreateFileDto, CreateFileDto>
{
    transform(
        value: CreateFileDto,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        metadata: ArgumentMetadata,
    ): CreateFileDto {
        return value;
    }
}
