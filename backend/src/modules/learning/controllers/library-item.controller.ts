import { BaseControllerFactory } from "@config/controller/base-controller-factory";
import { CrudControllerConfig } from "@config/controller/crud-controller-config";
import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { LibraryItemConditionDto } from "../dto/library-item-condition.dto";
import { CreateLibraryItemDto } from "../dto/create-library-item.dto";
import { UpdateLibraryItemDto } from "../dto/update-library-item.dto";
import { LibraryItem } from "../entities/library-item.entity";
import { LibraryItemService } from "../services/library-item.service";

@Controller("library-item")
@ApiTags("library-item")
export class LibraryItemController extends BaseControllerFactory<LibraryItem>(
    LibraryItem,
    LibraryItemConditionDto,
    CreateLibraryItemDto,
    UpdateLibraryItemDto,
    CrudControllerConfig({ enableImport: true }),
) {
    constructor(private readonly libraryItemService: LibraryItemService) {
        super(libraryItemService);
    }
}
