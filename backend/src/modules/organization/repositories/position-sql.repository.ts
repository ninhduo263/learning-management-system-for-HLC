import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { Position } from "../entities/position.entity";
import { PositionModel } from "../models/position.model";
import { PositionRepository } from "./position-repository.interface";

export class PositionSqlRepository
    extends SqlRepository<Position>
    implements PositionRepository
{
    constructor(
        @InjectModel(PositionModel)
        private readonly positionModel: typeof PositionModel,
    ) {
        super(positionModel);
    }
}
