import { ApiRecordResponse } from "@common/decorator/api.decorator";
import { Authorization, ReqUser } from "@common/decorator/auth.decorator";
import { UploadFile } from "@common/decorator/file.decorator";
import { User } from "@module/user/entities/user.entity";
import {
    Body,
    Controller,
    Delete,
    Param,
    Post,
    UploadedFile,
} from "@nestjs/common";
import { ApiBody, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { CreateFileResponseDto } from "./dto/create-file-response.dto";
import { CreateFileDto } from "./dto/create-file.dto";
import { File } from "./entities/file.entity";
import { FileService } from "./file.service";
import { FileUploadTransform } from "./pipe/file-upload-transform.pipe";
import { ClientInitMultipartUploadDto } from "./dto/client-init-multipart-upload.dto";
import { ClientCompleteMultipartUploadDto } from "./dto/client-complete-multipart-upload.dto";

@Controller("file")
@ApiTags("file")
@Authorization()
export class FileController {
    constructor(private readonly fileService: FileService) {}

    @Post("multipart/init")
    async initUploadMultipart(
        @ReqUser() user: User,
        @Body() body: ClientInitMultipartUploadDto,
    ) {
        return this.fileService.initiateMultipartUpload(user, body);
    }

    @Post("multipart/complete")
    async completeUploadMultipart(
        @ReqUser() user: User,
        @Body() body: ClientCompleteMultipartUploadDto,
    ) {
        return this.fileService.clientCompleteMultipartUpload(user, body);
    }

    @Post()
    @ApiConsumes("multipart/form-data")
    @UploadFile()
    @ApiRecordResponse(CreateFileResponseDto)
    @ApiBody({ type: CreateFileDto })
    async create(
        @ReqUser() user: User,
        @Body(FileUploadTransform) dto: CreateFileDto,
        @UploadedFile() file: Express.Multer.File,
    ) {
        const data = await this.fileService.create(user, dto, file);
        return data;
    }

    @Delete(":id")
    @ApiRecordResponse(File)
    async deleteById(@ReqUser() user: User, @Param("id") id: string) {
        await this.fileService.deleteById(user, id);
    }

    @Post("compress/files")
    async compressFiles() {
        await this.fileService.compressFiles();
    }
}
