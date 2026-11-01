import { FileModel } from "@module/repository/sequelize/model/file.model";
import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { ModelCtor } from "sequelize-typescript";
import { File } from "../entities/file.entity";
import { FileRepository } from "./file-repository.interface";

export class FileSqlRepository
    extends SqlRepository<File>
    implements FileRepository
{
    constructor(
        @InjectModel(FileModel)
        private readonly fileModel: ModelCtor<FileModel>,
    ) {
        super(fileModel);
    }
}
