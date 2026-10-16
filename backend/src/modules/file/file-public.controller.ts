import { Controller, Get, Next, Param, Req, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { NextFunction, Request, Response } from "express";
import { FileService } from "./file.service";

@Controller("file")
@ApiTags("file")
export class FilePublicController {
    constructor(private readonly fileService: FileService) {}

    @Get(":id/info")
    @ApiBearerAuth()
    async getFileInfo(@Param("id") id: string, @Req() req: Request) {
        return this.fileService.getFileInfo(null, id, req);
    }

    @Get(":id/:name")
    @ApiBearerAuth()
    async getFileData(
        @Param("id") id: string,
        @Req() req: Request,
        @Res() res: Response,
        @Next() next: NextFunction,
    ) {
        await this.fileService.getFileData(null, id, req, res, next);
    }
}
