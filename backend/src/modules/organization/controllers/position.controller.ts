import { BaseControllerFactory } from "@config/controller/base-controller-factory";
import { CrudControllerConfig } from "@config/controller/crud-controller-config";
import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PositionConditionDto } from "../dto/position-condition.dto";
import { CreatePositionDto } from "../dto/create-position.dto";
import { UpdatePositionDto } from "../dto/update-position.dto";
import { Position } from "../entities/position.entity";
import { PositionService } from "../services/position.service";

@Controller("position")
@ApiTags("position")
export class PositionController extends BaseControllerFactory<Position>(
    Position,
    PositionConditionDto,
    CreatePositionDto,
    UpdatePositionDto,
    CrudControllerConfig(),
) {
    constructor(private readonly positionService: PositionService) {
        super(positionService);
    }
}
