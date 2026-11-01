/* eslint-disable max-classes-per-file */
import {
    DeleteManyQuery,
    GetManyQuery,
    GetOneQuery,
    GetPageQuery,
    UpdateManyQuery,
} from "@common/constant";
import { EntityDefinition } from "@common/constant/class/entity-definition";
import {
    ApiCondition,
    ApiGet,
    ApiListResponse,
    ApiPageResponse,
    ApiRecordResponse,
} from "@common/decorator/api.decorator";
import { ReqUser } from "@common/decorator/auth.decorator";
import {
    RequestCondition,
    RequestQuery,
} from "@common/decorator/query.decorator";
import { DeleteManyByIdsDto } from "@common/dto/delete-many-by-ids.dto";
import { EntityDefinitionDto } from "@common/dto/entity-definition/entity-definition.dto";
import { ImportResultDto } from "@common/dto/entity-definition/import-result.dto";
import { ExportQueryDto } from "@common/dto/export-query.dto";
import { BaseEntity } from "@common/interface/base-entity.interface";
import { BaseImportDto } from "@common/interface/base-import.dto";
import { AbstractValidationPipe } from "@common/pipe/abstract-validation.pipe";
import {
    BaseControllerSetup,
    BaseRouteSetup,
} from "@config/controller/base-controller.decorator";
import {
    BaseController,
    BaseControllerConfig,
} from "@config/controller/base-controller.interface";
import { BaseService } from "@config/service/base.service";
import {
    BaseRepository,
    QueryCondition,
    UpdateDocument,
} from "@module/repository/common/base-repository.interface";
import { SystemRole } from "@module/user/common/constant";
import { User } from "@module/user/entities/user.entity";
import {
    Body,
    Type as ClassType,
    Next,
    Param,
    Query,
    Res,
    UsePipes,
} from "@nestjs/common";
import { ApiBody, ApiProperty, PartialType, PickType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsString, ValidateNested } from "class-validator";
import { NextFunction, Response } from "express";

const ClassName = (name: string, cls: ClassType) =>
    ({ [name]: class extends cls {} })[name];

export function BaseControllerFactory<E extends BaseEntity>(
    entity: ClassType<E>,
    conditionDto: ClassType<unknown>,
    createDto: ClassType<unknown>,
    updateDto: ClassType<unknown>,
    config: BaseControllerConfig = {
        authorize: true,
        routes: {
            create: {
                roles: [SystemRole.ADMIN],
            },
            getById: {
                roles: [SystemRole.ADMIN],
            },
            getOne: {
                roles: [SystemRole.ADMIN],
            },
            getMany: {
                roles: [SystemRole.ADMIN],
            },
            getPage: {
                roles: [SystemRole.ADMIN],
            },
            updateById: {
                roles: [SystemRole.ADMIN],
            },
            updateByIds: {
                roles: [SystemRole.ADMIN],
            },
            deleteById: {
                roles: [SystemRole.ADMIN],
            },
            deleteByIds: {
                roles: [SystemRole.ADMIN],
            },
            importDefinition: {
                roles: [SystemRole.ADMIN],
            },
            importXlsxTemplate: {
                roles: [SystemRole.ADMIN],
            },
            importInsert: {
                roles: [SystemRole.ADMIN],
            },
            importValidate: {
                roles: [SystemRole.ADMIN],
            },
            exportDefinition: {
                roles: [SystemRole.ADMIN],
            },
            exportXlsx: {
                roles: [SystemRole.ADMIN],
            },
        },
        import: {
            enable: true,
        },
    },
): new (
    service: BaseService<E, BaseRepository<E, unknown>>,
) => BaseController<E> {
    conditionDto = conditionDto || PartialType(entity);
    createDto =
        createDto || ClassName(`Create${entity.name}DefaultDto`, entity);
    updateDto =
        updateDto ||
        ClassName(`Update${entity.name}DefaultDto`, PartialType(entity));

    class UpdateManyByIdsDto {
        @IsString({ each: true })
        @ApiProperty({ type: [String] })
        ids: string[];

        @ApiProperty({ type: updateDto })
        @ValidateNested()
        @Type(() => updateDto)
        update: UpdateDocument<E>;
    }

    const updateManyIdsDto = ClassName(
        `UpdateMany${entity.name}IdsDto`,
        UpdateManyByIdsDto,
    );

    const createPipe = new AbstractValidationPipe(
        { whitelist: true },
        { body: createDto },
    );
    const updatePipe = new AbstractValidationPipe(
        { whitelist: true },
        { body: updateDto },
    );
    const updateManyByIdsPipe = new AbstractValidationPipe(
        { whitelist: true },
        { body: UpdateManyByIdsDto },
    );
    const deleteManyByIdsPipe = new AbstractValidationPipe(
        { whitelist: true },
        { body: DeleteManyByIdsDto },
    );

    @BaseControllerSetup(config)
    // @ApiTags(entity.name)
    class Controller implements BaseController<E> {
        constructor(
            private readonly service: BaseService<
                E,
                BaseRepository<E, unknown>
            >,
        ) {
            this.service = service;
        }

        @BaseRouteSetup("create", config, "post")
        @ApiRecordResponse(entity, config.routes?.create?.document)
        @ApiBody({ type: createDto })
        @UsePipes(createPipe)
        async create(@ReqUser() user: User, @Body() dto: Partial<E>) {
            return this.service.create(user, dto);
        }

        @BaseRouteSetup("getMany", config, "get")
        @ApiListResponse(entity, config.routes?.getMany?.document)
        @ApiCondition()
        @ApiGet({ mode: "many" })
        async getMany(
            @ReqUser() user: User,
            @RequestCondition(conditionDto) conditions: QueryCondition<E>,
            @RequestQuery() query: GetManyQuery<E>,
        ) {
            return this.service.getMany(user, conditions, query);
        }

        @BaseRouteSetup("getPage", config, "get")
        @ApiPageResponse(entity, config.routes?.getPage?.document)
        @ApiCondition()
        @ApiGet()
        async getPage(
            @ReqUser() user: User,
            @RequestCondition(conditionDto) conditions: QueryCondition<E>,
            @RequestQuery() query: GetPageQuery<E>,
        ) {
            return this.service.getPage(user, conditions, query);
        }

        @BaseRouteSetup("getOne", config, "get")
        @ApiRecordResponse(entity, config.routes?.getOne?.document)
        @ApiCondition()
        @ApiGet({ mode: "one" })
        async getOne(
            @ReqUser() user: User,
            @RequestCondition(conditionDto) conditions: QueryCondition<E>,
            @RequestQuery() query: GetOneQuery<E>,
        ) {
            return this.service.getOne(user, conditions, query);
        }

        @BaseRouteSetup("getById", config, "get")
        @ApiRecordResponse(entity, config.routes?.getById?.document)
        async getById(@ReqUser() user: User, @Param("id") id: string) {
            return this.service.getById(user, id);
        }

        @BaseRouteSetup("upsert", config, "post")
        @ApiBody({ type: updateDto })
        @ApiRecordResponse(entity, config.routes?.upsert?.document)
        @UsePipes(updatePipe)
        async upsert(@ReqUser() user: User, @Body() dto: UpdateDocument<E>) {
            return this.service.upsert(user, dto);
        }

        @BaseRouteSetup("getOneOrUpsert", config, "post")
        @ApiBody({ type: updateDto })
        @ApiRecordResponse(entity, config.routes?.getOneOrUpsert?.document)
        @UsePipes(updatePipe)
        async getOneOrUpsert(
            @ReqUser() user: User,
            @Body() dto: UpdateDocument<E>,
        ) {
            return this.service.getOneOrUpsert(user, dto);
        }

        @BaseRouteSetup("updateById", config, "put")
        @ApiBody({ type: updateDto })
        @ApiRecordResponse(entity, config.routes?.updateById?.document)
        @UsePipes(updatePipe)
        async updateById(
            @ReqUser() user: User,
            @Param("id") id: string,
            @Body() dto: UpdateDocument<E>,
        ) {
            return this.service.updateById(user, id, dto);
        }

        @BaseRouteSetup("updateByIds", config, "put")
        @ApiBody({ type: updateManyIdsDto })
        @ApiRecordResponse(Object, config.routes?.updateByIds?.document)
        @UsePipes(updateManyByIdsPipe)
        async updateManyByIds(
            @ReqUser() user: User,
            @Body() dto: UpdateManyByIdsDto,
            @RequestQuery() query: UpdateManyQuery<E>,
        ) {
            return this.service.updateManyByIds(user, dto, query);
        }

        @BaseRouteSetup("deleteById", config, "delete")
        @ApiRecordResponse(entity, config.routes?.deleteById?.document)
        async deleteById(@ReqUser() user: User, @Param("id") id: string) {
            return this.service.deleteById(user, id);
        }

        @BaseRouteSetup("deleteByIds", config, "delete")
        @UsePipes(deleteManyByIdsPipe)
        @ApiRecordResponse(Object, config.routes?.deleteByIds?.document)
        async deleteManyByIds(
            @ReqUser() user: User,
            @Body() dto: DeleteManyByIdsDto,
            @RequestQuery() query: DeleteManyQuery<E>,
        ) {
            return this.service.deleteManyByIds(user, dto, query);
        }

        @BaseRouteSetup("importDefinition", config, "get")
        @ApiListResponse(
            EntityDefinitionDto,
            config?.routes?.importDefinition?.document,
        )
        async getImportDefinition(@ReqUser() user: User) {
            return this.service
                .getImportService()
                .getImportDefinition(user, config.import?.dto || entity);
        }

        @BaseRouteSetup("importXlsxTemplate", config, "get")
        @ApiRecordResponse(Object, config.routes?.importXlsxTemplate?.document)
        async getImportXlsxTemplate(
            @ReqUser() user: User,
            @Res() res: Response,
            @Next() next: NextFunction,
        ) {
            return this.service
                .getImportService()
                .getImportTemplate(
                    user,
                    config.import?.dto || entity,
                    res,
                    next,
                );
        }

        @BaseRouteSetup("importValidate", config, "post")
        @ApiRecordResponse(
            ImportResultDto,
            config.routes?.importValidate?.document,
        )
        async importValidate(
            @ReqUser() user: User,
            @Body() dto: BaseImportDto,
            @Query() query: unknown,
            @Param() params: unknown,
        ) {
            const importFields = EntityDefinition.getImportDefinition(
                entity,
            ).map((def) => def.field);
            const RowClass = PickType(
                config.import?.dto || entity,
                importFields as any,
            );
            return this.service
                .getImportService()
                .insertImport(user, dto, RowClass, {
                    dryRun: true,
                    query,
                    params,
                });
        }

        @BaseRouteSetup("importInsert", config, "post")
        @ApiRecordResponse(
            ImportResultDto,
            config.routes?.importInsert?.document,
        )
        async importInsert(
            @ReqUser() user: User,
            @Body() dto: BaseImportDto,
            @Query() query: unknown,
            @Param() params: unknown,
        ) {
            const importFields = EntityDefinition.getImportDefinition(
                entity,
            ).map((def) => def.field);
            const RowClass = PickType(
                config.import?.dto || entity,
                importFields as any,
            );
            return this.service
                .getImportService()
                .insertImport(user, dto, RowClass, {
                    dryRun: false,
                    query,
                    params,
                });
        }

        @BaseRouteSetup("exportDefinition", config, "get")
        @ApiListResponse(
            EntityDefinitionDto,
            config.routes?.exportDefinition?.document,
        )
        async getExportDefinition(@ReqUser() user: User) {
            return this.service
                .getImportService()
                .getExportDefinition(user, entity);
        }

        @BaseRouteSetup("exportXlsx", config, "post")
        @ApiCondition()
        @ApiGet({ mode: "many" })
        @ApiRecordResponse(Object, config.routes?.exportXlsx?.document)
        async getExport(
            @ReqUser() user: User,
            @RequestCondition(conditionDto) conditions: QueryCondition<E>,
            @RequestQuery() query: GetPageQuery<E>,
            @Body() exportQuery: ExportQueryDto,
            @Res() res: Response,
            @Next() next: NextFunction,
        ) {
            return this.service
                .getImportService()
                .getExport(
                    user,
                    entity,
                    conditions,
                    query,
                    exportQuery,
                    res,
                    next,
                );
        }
    }
    return Controller;
}
