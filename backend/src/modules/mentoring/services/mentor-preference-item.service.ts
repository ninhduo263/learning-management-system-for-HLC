import { BaseService } from "@config/service/base.service";
import { Entity } from "@module/repository";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { InjectTransaction } from "@module/repository/common/transaction";
import { Injectable } from "@nestjs/common";
import { MentorPreferenceItem } from "../entities/mentor-preference-item.entity";
import { MentorPreferenceItemRepository } from "../repositories/mentor-preference-item-repository.interface";

@Injectable()
export class MentorPreferenceItemService extends BaseService<
    MentorPreferenceItem,
    MentorPreferenceItemRepository
> {
    constructor(
        @InjectRepository(Entity.MENTOR_PREFERENCE_ITEM)
        private readonly mentorPreferenceItemRepository: MentorPreferenceItemRepository,
        @InjectTransaction()
        private readonly mentorPreferenceItemTransaction: BaseTransaction,
    ) {
        super(mentorPreferenceItemRepository, {
            notFoundCode: "error-record-not-found",
            transaction: mentorPreferenceItemTransaction,
        });
    }
}
