import { Auth } from "@module/auth/entities/auth.entity";
import { AuthRepository } from "@module/auth/repository/auth-repository.interface";
import { Entity } from "@module/repository";
import { MongoRepository } from "@module/repository/mongo/mongo.repository";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

export class AuthMongoRepository
    extends MongoRepository<Auth>
    implements AuthRepository
{
    constructor(
        @InjectModel(Entity.AUTH) private readonly authModel: Model<Auth>,
    ) {
        super(authModel, { populate: { getById: [{ path: "user" }] } });
    }
}
