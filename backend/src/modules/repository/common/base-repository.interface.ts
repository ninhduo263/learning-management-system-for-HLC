import {
    ArrayEntityKeyOf,
    CountQuery,
    CreateQuery,
    DeleteByIdQuery,
    DeleteManyQuery,
    DeleteManyResult,
    DeleteOneQuery,
    DistinctQuery,
    ExistQuery,
    GetBatchQuery,
    GetByIdQuery,
    GetManyQuery,
    GetMapQuery,
    GetOneQuery,
    GetPageQuery,
    InsertManyQuery,
    UpdateByIdQuery,
    UpdateManyQuery,
    UpdateManyResult,
    UpdateOneQuery,
} from "@common/constant";
import { CommonQueryDto } from "@common/dto/common-query.dto";
import { ExportQueryDto } from "@common/dto/export-query.dto";
import { PageableDto } from "@common/dto/pageable.dto";
import { PopulationDto } from "@common/dto/population.dto";
import { BaseEntity } from "@common/interface/base-entity.interface";
import { Type } from "@nestjs/common";

export type PartialKeyOf<E> = keyof E | (string & {});

export type CreateDocument<E extends BaseEntity> = Partial<E>;

export type UpdateOperator<E extends BaseEntity> = {
    $inc?: { [P in keyof E]: number } | { [key: string]: number };
};

export type UpdateDocument<E extends BaseEntity> =
    | Partial<CreateDocument<E>>
    | UpdateOperator<E>
    | object;

export type ConditionCriteria<T> = {
    $in?: T[];
    $nin?: T[];
    $eq?: T;
    $ne?: T;
    $gt?: T;
    $gte?: T;
    $lt?: T;
    $lte?: T;
    $exist?: boolean;
    $like?: string | RegExp;
    $regex?: string | RegExp;
    $not?: ConditionCriteria<T>;
};

export type QueryOperator<E> = {
    $or?: QueryCondition<E>[];
    $and?: QueryCondition<E>[];
};

export type QueryCondition<E = any> = {
    [P in keyof E]?:
        | boolean
        | number
        | bigint
        | string
        | Date
        | ConditionCriteria<E[P]>
        | object;
} & {
    [key: string]:
        | boolean
        | number
        | bigint
        | string
        | Date
        | ConditionCriteria<unknown>
        | object;
} & QueryOperator<E>;

type BasePopulateKey =
    | "getById"
    | "getOne"
    | "getMany"
    | "getPage"
    | "getBatch"
    | "getExport";

type BasePopulateOption<E extends BaseEntity> = {
    [key in BasePopulateKey]?: PopulationDto<E>[];
};

export type BaseRepositoryOption<E extends BaseEntity> = {
    populate?: BasePopulateOption<E>;
    dataPartition?: {
        mapping: keyof E | ArrayEntityKeyOf<E>;
    };
};

export type BaseQueryOption<T = unknown> = {
    transaction?: T;
};

export type BaseCommandOption<T> = {
    transaction?: T;
};

export interface BaseRepository<E extends BaseEntity, T = any> {
    getDataPartitionRecord(
        options: Pick<CommonQueryDto, "enableDataPartition">,
    ): Record<string, string>;
    getDataPartitionCondition(
        options: Pick<CommonQueryDto, "enableDataPartition">,
    ): Record<string, string>;

    create(
        document: CreateDocument<E>,
        query?: CreateQuery<E> & BaseCommandOption<T>,
    ): Promise<E>;

    insertMany(
        documents: CreateDocument<E>[],
        options?: InsertManyQuery<E> & BaseCommandOption<T>,
    ): Promise<{ n: number }>;

    getById(
        id: string,
        query?: GetByIdQuery<E> & BaseQueryOption<T>,
    ): Promise<E | null>;

    getOne(
        conditions: QueryCondition<E>,
        query?: GetOneQuery<E> & BaseQueryOption<T>,
    ): Promise<E | null>;

    getMany(
        conditions: QueryCondition<E>,
        query?: GetManyQuery<E> & BaseQueryOption<T>,
    ): Promise<E[]>;

    getPage(
        conditions: QueryCondition<E>,
        query?: GetPageQuery<E> & BaseQueryOption<T>,
    ): Promise<PageableDto<E>>;

    getBatch(
        conditions: any,
        query?: GetBatchQuery<E> & BaseQueryOption<T>,
    ): AsyncGenerator<E[], E[], string>;

    distinct<Type extends string = string>(
        field: PartialKeyOf<E>,
        conditions?: QueryCondition<E>,
        query?: DistinctQuery<E> & BaseQueryOption<T>,
    ): Promise<Type[]>;

    updateById(
        id: string,
        update: UpdateDocument<E>,
        query?: UpdateByIdQuery<E> & BaseCommandOption<T>,
    ): Promise<E | null>;

    updateOne(
        conditions: QueryCondition<E>,
        update: UpdateDocument<E>,
        query?: UpdateOneQuery<E> & BaseCommandOption<T>,
    ): Promise<E | null>;

    updateMany(
        conditions: QueryCondition<E>,
        update: UpdateDocument<E>,
        query?: UpdateManyQuery<E> & BaseCommandOption<T>,
    ): Promise<UpdateManyResult>;

    deleteById(
        id: string,
        query?: DeleteByIdQuery<E> & BaseCommandOption<T>,
    ): Promise<E>;

    deleteOne(
        conditions: QueryCondition<E>,
        query?: DeleteOneQuery<E> & BaseCommandOption<T>,
    ): Promise<E>;
    deleteMany(
        conditions: QueryCondition<E>,
        query?: DeleteManyQuery<E> & BaseCommandOption<T>,
    ): Promise<DeleteManyResult>;

    exists(
        conditions?: QueryCondition<E>,
        query?: ExistQuery<E> & BaseQueryOption<T>,
    ): Promise<boolean>;
    count(
        conditions?: QueryCondition<E>,
        query?: CountQuery<E> & BaseQueryOption<T>,
    ): Promise<number>;

    getExport(
        entity: Type<E>,
        conditions: any,
        query: CommonQueryDto<E> & BaseQueryOption<T>,
        exportQuery: ExportQueryDto,
    ): Promise<E[]>;

    getRepositoryErrors(err: Error): string[];

    getMap(
        keys: Array<keyof E>,
        condition: QueryCondition<E>,
        query?: Omit<GetMapQuery<E>, "listValue"> & BaseQueryOption<T>,
    ): Promise<Record<string, E>>;
    getMap(
        keys: Array<keyof E>,
        condition: QueryCondition<E>,
        query?: Omit<GetMapQuery<E>, "listValue"> &
            BaseQueryOption<T> & { listValue: false | undefined | null },
    ): Promise<Record<string, E>>;
    getMap(
        keys: Array<keyof E>,
        condition: QueryCondition<E>,
        query?: Omit<GetMapQuery<E>, "listValue"> &
            BaseQueryOption<T> & { listValue: true },
    ): Promise<Record<string, E[]>>;
    getMap(
        keys: Array<keyof E>,
        condition: QueryCondition<E>,
        query?: GetMapQuery<E> & BaseQueryOption<T>,
    ): Promise<Record<string, E | E[]>>;
}
