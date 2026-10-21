import { PartialType } from "@nestjs/swagger";
import { LibraryItem } from "../entities/library-item.entity";

export class LibraryItemConditionDto extends PartialType(LibraryItem) {}
