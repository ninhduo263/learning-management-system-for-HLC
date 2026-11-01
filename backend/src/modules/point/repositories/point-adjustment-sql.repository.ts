import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { PointAdjustment } from "../entities/point-adjustment.entity";
import { PointAdjustmentModel } from "../models/point-adjustment.model";
import { PointAdjustmentRepository } from "./point-adjustment-repository.interface";

export class PointAdjustmentSqlRepository
    extends SqlRepository<PointAdjustment>
    implements PointAdjustmentRepository
{
    constructor(
        @InjectModel(PointAdjustmentModel)
        private readonly pointAdjustmentModel: typeof PointAdjustmentModel,
    ) {
        super(pointAdjustmentModel);
    }
}
