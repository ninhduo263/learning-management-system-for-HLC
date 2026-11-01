import { MongoRepository } from "@module/repository/mongo/mongo.repository";
import { HamSinhMa } from "../entities/ham-sinh-ma.entity";
import { HamSinhMaRepository } from "./ham-sinh-ma-repository.interface";
import { InjectModel } from "@nestjs/mongoose";
import { Entity } from "@module/repository";
import { Model } from "mongoose";

export class HamSinhMaMongoRepository
    extends MongoRepository<HamSinhMa>
    implements HamSinhMaRepository
{
    constructor(
        @InjectModel(Entity.HAM_SINH_MA)
        private readonly hamSinhMaModel: Model<HamSinhMa>,
    ) {
        super(hamSinhMaModel);
    }
}
