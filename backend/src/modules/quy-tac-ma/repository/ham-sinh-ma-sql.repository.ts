import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { ModelCtor } from "sequelize-typescript";
import { HamSinhMa } from "../entities/ham-sinh-ma.entity";
import { HamSinhMaModel } from "../models/ham-sinh-ma.model";
import { HamSinhMaRepository } from "./ham-sinh-ma-repository.interface";

export class HamSinhMaSqlRepository
    extends SqlRepository<HamSinhMa>
    implements HamSinhMaRepository
{
    constructor(
        @InjectModel(HamSinhMaModel)
        private readonly hamSinhMaModel: ModelCtor<HamSinhMaModel>,
    ) {
        super(hamSinhMaModel);
    }
}
