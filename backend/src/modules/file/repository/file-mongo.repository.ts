import { FileRepository } from "@module/file/repository/file-repository.interface";
import { Entity } from "@module/repository";
import { MongoRepository } from "@module/repository/mongo/mongo.repository";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { File } from "../entities/file.entity";

export class FileMongoRepository
    extends MongoRepository<File>
    implements FileRepository
{
    constructor(
        @InjectModel(Entity.FILE) private readonly fileModel: Model<File>,
    ) {
        super(fileModel);
    }
}
