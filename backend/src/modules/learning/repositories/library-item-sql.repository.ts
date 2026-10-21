import { SqlRepository } from "@module/repository/sequelize/sql.repository";
import { InjectModel } from "@nestjs/sequelize";
import { LibraryItem } from "../entities/library-item.entity";
import { LibraryItemModel } from "../models/library-item.model";
import { LibraryItemRepository } from "./library-item-repository.interface";

export class LibraryItemSqlRepository
    extends SqlRepository<LibraryItem>
    implements LibraryItemRepository
{
    constructor(
        @InjectModel(LibraryItemModel)
        private readonly libraryItemModel: typeof LibraryItemModel,
    ) {
        super(libraryItemModel);
    }
}
