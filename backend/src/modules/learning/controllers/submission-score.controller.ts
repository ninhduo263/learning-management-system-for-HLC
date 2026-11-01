import { BaseControllerFactory } from "@config/controller/base-controller-factory";
import { CrudControllerConfig } from "@config/controller/crud-controller-config";
import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SubmissionScoreConditionDto } from "../dto/submission-score-condition.dto";
import { CreateSubmissionScoreDto } from "../dto/create-submission-score.dto";
import { UpdateSubmissionScoreDto } from "../dto/update-submission-score.dto";
import { SubmissionScore } from "../entities/submission-score.entity";
import { SubmissionScoreService } from "../services/submission-score.service";

@Controller("submission-score")
@ApiTags("submission-score")
export class SubmissionScoreController extends BaseControllerFactory<SubmissionScore>(
    SubmissionScore,
    SubmissionScoreConditionDto,
    CreateSubmissionScoreDto,
    UpdateSubmissionScoreDto,
    CrudControllerConfig(),
) {
    constructor(
        private readonly submissionScoreService: SubmissionScoreService,
    ) {
        super(submissionScoreService);
    }
}
