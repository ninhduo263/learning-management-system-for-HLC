import { OneSignalUserRepository } from "@module/one-signal/repository/one-signal-user-repository.interface";
import { Entity } from "@module/repository";
import { MongoRepository } from "@module/repository/mongo/mongo.repository";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { OneSignalUser } from "../entities/one-signal-user.entity";

export class OneSignalUserMongoRepository
    extends MongoRepository<OneSignalUser>
    implements OneSignalUserRepository
{
    constructor(
        @InjectModel(Entity.ONE_SIGNAL_USER)
        private readonly oneSignalUserModel: Model<OneSignalUser>,
    ) {
        super(oneSignalUserModel);
    }
}
