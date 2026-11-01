import { Entity } from "@module/repository";
import { MongoRepository } from "@module/repository/mongo/mongo.repository";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { IncrementName } from "../common/constant";
import { Increment } from "../entities/increment.entity";
import { IncrementRepository } from "./increment-repository.interface";

export class IncrementMongoRepository
    extends MongoRepository<Increment>
    implements IncrementRepository
{
    constructor(
        @InjectModel(Entity.INCREMENT)
        private readonly incrementModel: Model<Increment>,
    ) {
        super(incrementModel);
    }

    async increase(name: IncrementName): Promise<Increment> {
        return this.incrementModel.findOneAndUpdate(
            { name },
            { $inc: { count: 1 } },
            { new: true, upsert: true },
        );
    }
}
