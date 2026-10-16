import { Entity } from "@module/repository";
import { MongoRepository } from "@module/repository/mongo/mongo.repository";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { QuyTacMa } from "../entities/quy-tac-ma.entity";
import { QuyTacMaRepository } from "./quy-tac-ma-repository.interface";

export class QuyTacMaMongoRepository
    extends MongoRepository<QuyTacMa>
    implements QuyTacMaRepository
{
    constructor(
        @InjectModel(Entity.HAM_SINH_MA)
        private readonly quyTacMaModel: Model<QuyTacMa>,
    ) {
        super(quyTacMaModel);
    }
}
