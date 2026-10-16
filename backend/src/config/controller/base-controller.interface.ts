import { GetManyQuery, GetOneQuery, GetPageQuery } from "@common/constant";
import { ErrorData } from "@common/decorator/api.decorator";
import { ExportDefinitionDto } from "@common/dto/entity-definition/export-definition.dto";
import { ImportDefinitionDto } from "@common/dto/entity-definition/import-definition.dto";
import { ImportResultDto } from "@common/dto/entity-definition/import-result.dto";
import { ExportQueryDto } from "@common/dto/export-query.dto";
import { PageableDto } from "@common/dto/pageable.dto";
import { BaseEntity } from "@common/interface/base-entity.interface";
import { BaseImportDto } from "@common/interface/base-import.dto";
import { AuditLogProps } from "@module/audit-log/common/constant";
import { QueryCondition } from "@module/repository/common/base-repository.interface";
import { SystemRole } from "@module/user/common/constant";
import { User } from "@module/user/entities/user.entity";
import { HttpStatus, Type } from "@nestjs/common";
import {
    ApiOperationOptions,
    ApiParamOptions,
    ApiQueryOptions,
    ApiResponseOptions,
} from "@nestjs/swagger";
import { NextFunction, Response } from "express";

export interface BaseImportController<E extends BaseEntity> {
    getImportDefinition(user: User): Promise<ImportDefinitionDto[]>;

    getImportXlsxTemplate(
        user: User,
        res: Response,
        next: NextFunction,
    ): Promise<void>;

    importValidate(
        user: User,
        dto: BaseImportDto,
        query: unknown,
        param: unknown,
    ): Promise<ImportResultDto>;

    importInsert(
        user: User,
        dto: BaseImportDto,
        query: unknown,
        param: unknown,
    ): Promise<ImportResultDto>;

    getExportDefinition(user: User): Promise<ExportDefinitionDto[]>;
    getExport(
        user: User,
        conditions: QueryCondition<E>,
        query: GetPageQuery<E>,
        exportQuery: ExportQueryDto,
        res: Response,
        next: NextFunction,
    ): Promise<void>;
}

export interface BaseController<E extends BaseEntity>
    extends BaseImportController<E> {
    create(user: User, dto: unknown): Promise<E>;

    getMany(
        user: User,
        conditions: unknown,
        query: GetManyQuery<E>,
    ): Promise<E[]>;

    getPage(
        user: User,
        conditions: unknown,
        query: GetPageQuery<E>,
    ): Promise<PageableDto<E>>;

    getById(user: User, id: string): Promise<E>;

    getOne(user: User, conditions: unknown, query: GetOneQuery<E>): Promise<E>;

    updateById(user: User, id: string, dto: unknown): Promise<E>;

    deleteById(user: User, id: string): Promise<E>;
}

export interface BaseControllerConfig {
    authorize?: boolean;
    roles?: SystemRole[];
    dataPartition?: {
        enable?: boolean;
        /**
         * Bắt buộc phải bổ sung thông tin data partition trong truy vấn
         *
         * Chỉ hoạt động nếu `enable: true`
         */
        require?: boolean;
    };
    routes?: {
        [key in BaseRoute]?: BaseRouteConfig;
    };
    import?: {
        enable?: boolean;
        dto?: Type<any>;
    };
}

export interface BaseImportControllerConfig
    extends Omit<BaseControllerConfig, "routes" | "import"> {
    import?: {
        dto?: Type<any>;
    };
    routes?: {
        [key in BaseImportRoute]?: BaseRouteConfig;
    };
}

export interface BaseRouteConfig {
    enable?: boolean;
    roles?: SystemRole[];
    auditLog?: { enable: true } & AuditLogProps;
    dataPartition?: {
        enable?: boolean;
        /**
         * Bắt buộc phải bổ sung thông tin data partition trong truy vấn
         *
         * Chỉ hoạt động nếu `enable: true`
         */
        require?: boolean;
    };
    document?: {
        operator?: ApiOperationOptions;
        param?: Array<ApiParamOptions>;
        query?: Array<ApiQueryOptions>;
        response?: ApiResponseOptions;
        errorResponses?: Array<{ statusCode: HttpStatus; errors: ErrorData[] }>;
    };
}

export type BaseImportRoute =
    | "importDefinition"
    | "importXlsxTemplate"
    | "importValidate"
    | "importInsert"
    | "exportDefinition"
    | "exportXlsx";

export type BaseRoute =
    | "create"
    | "getMany"
    | "getPage"
    | "getById"
    | "getOne"
    | "updateById"
    | "updateByIds"
    | "upsert"
    | "getOneOrUpsert"
    | "deleteById"
    | "deleteByIds"
    | BaseImportRoute;
