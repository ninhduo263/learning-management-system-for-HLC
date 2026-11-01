import { Entity } from "@module/repository";
import { MongoRepository } from "@module/repository/mongo/mongo.repository";
import { TopicRepository } from "@module/topic/repository/topic-repository.interface";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Topic } from "../entities/topic.entity";

export class TopicMongoRepository
    extends MongoRepository<Topic>
    implements TopicRepository
{
    constructor(
        @InjectModel(Entity.TOPIC) private readonly topicModel: Model<Topic>,
    ) {
        super(topicModel);
    }
}
