import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { PointEntry } from "../entities/point-entry.entity";
import { PointEntryModel } from "../models/point-entry.model";
import { PointEntryRepository } from "./point-entry-repository.interface";

export class PointEntrySqlRepository
    extends SqlRepository<PointEntry>
    implements PointEntryRepository
{
    constructor(
        @InjectModel(PointEntryModel)
        private readonly pointEntryModel: typeof PointEntryModel,
    ) {
        super(pointEntryModel);
    }
}
