import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { PointType } from "../entities/point-type.entity";
import { PointTypeModel } from "../models/point-type.model";
import { PointTypeRepository } from "./point-type-repository.interface";

export class PointTypeSqlRepository
    extends SqlRepository<PointType>
    implements PointTypeRepository
{
    constructor(
        @InjectModel(PointTypeModel)
        private readonly pointTypeModel: typeof PointTypeModel,
    ) {
        super(pointTypeModel);
    }
}
