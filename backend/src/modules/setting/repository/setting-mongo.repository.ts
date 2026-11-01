import { Entity } from "@module/repository";
import { MongoRepository } from "@module/repository/mongo/mongo.repository";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Setting } from "../entities/setting.entity";
import { SettingRepository } from "./setting-repository.interface";

export class SettingMongoRepository
    extends MongoRepository<Setting>
    implements SettingRepository
{
    constructor(
        @InjectModel(Entity.SETTING)
        private readonly settingModel: Model<Setting>,
    ) {
        super(settingModel);
    }
}
