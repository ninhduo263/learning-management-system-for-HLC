import { SettingModel } from "@module/repository/sequelize/model/setting.model";
import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { ModelCtor } from "sequelize-typescript";
import { Setting } from "../entities/setting.entity";
import { SettingRepository } from "./setting-repository.interface";

export class SettingSqlRepository
    extends SqlRepository<Setting>
    implements SettingRepository
{
    constructor(
        @InjectModel(SettingModel)
        private readonly settingModel: ModelCtor<SettingModel>,
    ) {
        super(settingModel);
    }
}
