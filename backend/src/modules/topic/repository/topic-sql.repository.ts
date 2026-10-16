import TopicModel from "@module/repository/sequelize/model/topic.model";
import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { ModelCtor } from "sequelize-typescript";
import { Topic } from "../entities/topic.entity";
import { TopicRepository } from "./topic-repository.interface";

export class TopicSqlRepository
    extends SqlRepository<Topic>
    implements TopicRepository
{
    constructor(
        @InjectModel(TopicModel)
        private readonly topicModel: ModelCtor<TopicModel>,
    ) {
        super(topicModel);
    }
}
