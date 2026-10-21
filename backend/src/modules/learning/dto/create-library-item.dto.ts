import { OmitType } from "@nestjs/swagger";
import { LibraryItem } from "../entities/library-item.entity";

export class CreateLibraryItemDto extends OmitType(LibraryItem, ["_id"]) {}
