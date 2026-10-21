import { BaseControllerFactory } from "@config/controller/base-controller-factory";
import { CrudControllerConfig } from "@config/controller/crud-controller-config";
import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SubmissionUniqueValueConditionDto } from "../dto/submission-unique-value-condition.dto";
import { CreateSubmissionUniqueValueDto } from "../dto/create-submission-unique-value.dto";
import { UpdateSubmissionUniqueValueDto } from "../dto/update-submission-unique-value.dto";
import { SubmissionUniqueValue } from "../entities/submission-unique-value.entity";
import { SubmissionUniqueValueService } from "../services/submission-unique-value.service";

@Controller("submission-unique-value")
@ApiTags("submission-unique-value")
export class SubmissionUniqueValueController extends BaseControllerFactory<SubmissionUniqueValue>(
    SubmissionUniqueValue,
    SubmissionUniqueValueConditionDto,
    CreateSubmissionUniqueValueDto,
    UpdateSubmissionUniqueValueDto,
    CrudControllerConfig({ readOnly: true }),
) {
    constructor(
        private readonly submissionUniqueValueService: SubmissionUniqueValueService,
    ) {
        super(submissionUniqueValueService);
    }
}
