import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { MentoringSession } from "../entities/mentoring-session.entity";
import { MentoringSessionModel } from "../models/mentoring-session.model";
import { MentoringSessionRepository } from "./mentoring-session-repository.interface";

export class MentoringSessionSqlRepository
    extends SqlRepository<MentoringSession>
    implements MentoringSessionRepository
{
    constructor(
        @InjectModel(MentoringSessionModel)
        private readonly mentoringSessionModel: typeof MentoringSessionModel,
    ) {
        super(mentoringSessionModel);
    }
}
