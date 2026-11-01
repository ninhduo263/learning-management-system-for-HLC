import { BaseService } from "@config/service/base.service";
import { Entity } from "@module/repository";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { InjectTransaction } from "@module/repository/common/transaction";
import { Injectable } from "@nestjs/common";
import { MentorPreference } from "../entities/mentor-preference.entity";
import { MentorPreferenceRepository } from "../repositories/mentor-preference-repository.interface";

@Injectable()
export class MentorPreferenceService extends BaseService<
    MentorPreference,
    MentorPreferenceRepository
> {
    constructor(
        @InjectRepository(Entity.MENTOR_PREFERENCE)
        private readonly mentorPreferenceRepository: MentorPreferenceRepository,
        @InjectTransaction()
        private readonly mentorPreferenceTransaction: BaseTransaction,
    ) {
        super(mentorPreferenceRepository, {
            notFoundCode: "error-record-not-found",
            transaction: mentorPreferenceTransaction,
        });
    }
}
