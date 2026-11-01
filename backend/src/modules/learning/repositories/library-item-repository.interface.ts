import { BaseRepository } from "@module/repository/common/base-repository.interface";
import { LibraryItem } from "../entities/library-item.entity";

export interface LibraryItemRepository extends BaseRepository<LibraryItem> {}
