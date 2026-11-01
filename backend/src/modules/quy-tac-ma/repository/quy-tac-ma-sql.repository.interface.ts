import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { ModelCtor } from "sequelize-typescript";
import { QuyTacMa } from "../entities/quy-tac-ma.entity";
import { QuyTacMaModel } from "../models/quy-tac-ma.model";
import { QuyTacMaRepository } from "./quy-tac-ma-repository.interface";

export class QuyTacMaSqlRepository
    extends SqlRepository<QuyTacMa>
    implements QuyTacMaRepository
{
    constructor(
        @InjectModel(QuyTacMaModel)
        private readonly quyTacMaModel: ModelCtor<QuyTacMaModel>,
    ) {
        super(quyTacMaModel);
    }
}
