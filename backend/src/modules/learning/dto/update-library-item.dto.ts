import { PartialType } from "@nestjs/swagger";
import { CreateLibraryItemDto } from "./create-library-item.dto";

export class UpdateLibraryItemDto extends PartialType(CreateLibraryItemDto) {}
