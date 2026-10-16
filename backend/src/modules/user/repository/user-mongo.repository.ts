import { Entity } from "@module/repository";
import { MongoRepository } from "@module/repository/mongo/mongo.repository";
import { UserRepository } from "@module/user/repository/user-repository.interface";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { User } from "../entities/user.entity";

export class UserMongoRepository
    extends MongoRepository<User>
    implements UserRepository
{
    constructor(
        @InjectModel(Entity.USER) private readonly userModel: Model<User>,
    ) {
        super(userModel, { dataPartition: { mapping: "dataPartitionCode" } });
    }

    getMe(user: User): Promise<User> {
        return this.userModel.findOne({ username: user.username }).exec();
    }
}
