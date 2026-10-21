import { BaseService } from "@config/service/base.service";
import { Entity } from "@module/repository";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { InjectTransaction } from "@module/repository/common/transaction";
import { Injectable } from "@nestjs/common";
import { LibraryItem } from "../entities/library-item.entity";
import { LibraryItemRepository } from "../repositories/library-item-repository.interface";

@Injectable()
export class LibraryItemService extends BaseService<
    LibraryItem,
    LibraryItemRepository
> {
    constructor(
        @InjectRepository(Entity.LIBRARY_ITEM)
        private readonly libraryItemRepository: LibraryItemRepository,
        @InjectTransaction()
        private readonly libraryItemTransaction: BaseTransaction,
    ) {
        super(libraryItemRepository, {
            notFoundCode: "error-record-not-found",
            transaction: libraryItemTransaction,
        });
    }
}
