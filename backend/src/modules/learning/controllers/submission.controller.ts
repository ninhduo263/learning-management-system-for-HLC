import { BaseControllerFactory } from "@config/controller/base-controller-factory";
import { CrudControllerConfig } from "@config/controller/crud-controller-config";
import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SubmissionConditionDto } from "../dto/submission-condition.dto";
import { CreateSubmissionDto } from "../dto/create-submission.dto";
import { UpdateSubmissionDto } from "../dto/update-submission.dto";
import { Submission } from "../entities/submission.entity";
import { SubmissionService } from "../services/submission.service";

@Controller("submission")
@ApiTags("submission")
export class SubmissionController extends BaseControllerFactory<Submission>(
    Submission,
    SubmissionConditionDto,
    CreateSubmissionDto,
    UpdateSubmissionDto,
    CrudControllerConfig(),
) {
    constructor(private readonly submissionService: SubmissionService) {
        super(submissionService);
    }
}
