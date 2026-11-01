import { BaseEntity } from "@common/interface/base-entity.interface";
import { BaseQueryOption } from "@module/repository/common/base-repository.interface";
import { CommonQueryDto } from "../dto/common-query.dto";

export type UpdateManyResult = { n?: number; affected: number };
export type DeleteManyResult = { n?: number; deleted: number };

export type CreateQuery<E extends BaseEntity = any> = Pick<
    CommonQueryDto<E>,
    "population" | "enableDataPartition"
>;

export type InsertManyQuery<E extends BaseEntity = any> = Pick<
    CommonQueryDto<E>,
    "enableDataPartition"
>;

export type GetByIdQuery<E extends BaseEntity = any> = Pick<
    CommonQueryDto<E>,
    "select" | "population" | "enableDataPartition"
>;

export type GetOneQuery<E extends BaseEntity = any> = Pick<
    CommonQueryDto<E>,
    "select" | "sort" | "filters" | "population" | "enableDataPartition"
> &
    BaseQueryOption<unknown>;

export type GetManyQuery<E extends BaseEntity = any> = Pick<
    CommonQueryDto<E>,
    "select" | "sort" | "filters" | "population" | "enableDataPartition"
> &
    BaseQueryOption<unknown>;

export type GetMapQuery<E extends BaseEntity = any> = Pick<
    CommonQueryDto<E>,
    "select" | "sort" | "filters" | "population" | "enableDataPartition"
> & { separator?: string; listValue?: boolean };

export type GetPageQuery<E extends BaseEntity = any> = Pick<
    CommonQueryDto<E>,
    | "select"
    | "sort"
    | "page"
    | "limit"
    | "skip"
    | "filters"
    | "population"
    | "enableDataPartition"
> &
    BaseQueryOption<unknown>;

export type GetBatchQuery<E extends BaseEntity = any> = Pick<
    CommonQueryDto<E>,
    "select" | "limit" | "population" | "enableDataPartition"
> &
    BaseQueryOption<unknown>;

export type ExistQuery<E extends BaseEntity = any> = Pick<
    CommonQueryDto<E>,
    "filters" | "enableDataPartition"
> &
    BaseQueryOption<unknown>;

export type DistinctQuery<E extends BaseEntity = any> = Pick<
    CommonQueryDto<E>,
    "filters" | "population" | "enableDataPartition"
>;

export type CountQuery<E extends BaseEntity = any> = Pick<
    CommonQueryDto<E>,
    "filters" | "population" | "enableDataPartition"
> &
    BaseQueryOption<unknown>;

type UpdateQuery<E extends BaseEntity = any> = {
    upsert?: boolean;
    new?: boolean;
} & Pick<CommonQueryDto<E>, "enableDataPartition">;
export type UpdateByIdQuery<E extends BaseEntity = any> = UpdateQuery<E> &
    BaseQueryOption<unknown>;
export type UpdateOneQuery<E extends BaseEntity = any> = Pick<
    CommonQueryDto<E>,
    "sort" | "filters" | "enableDataPartition"
> &
    UpdateQuery<E> &
    BaseQueryOption<unknown>;
export type UpdateManyQuery<E extends BaseEntity = any> = Pick<
    CommonQueryDto<E>,
    "filters" | "enableDataPartition"
> &
    UpdateQuery<E> &
    BaseQueryOption<unknown>;

export type DeleteByIdQuery<E extends BaseEntity = any> = Pick<
    CommonQueryDto<E>,
    "enableDataPartition"
>;

export type DeleteOneQuery<E extends BaseEntity = any> = Pick<
    CommonQueryDto<E>,
    "sort" | "filters" | "enableDataPartition"
> &
    BaseQueryOption<unknown>;
export type DeleteManyQuery<E extends BaseEntity = any> = Pick<
    CommonQueryDto<E>,
    "filters" | "enableDataPartition"
> &
    BaseQueryOption<unknown>;

export type EntityKeyOf<E> =
    E extends Array<infer V> ? V : E extends object ? E : never;

type Prev = [0, 0, 1, 2];

export type ArrayEntityKeyOf<E, Depth extends number = 3> = Depth extends 0
    ? string[]
    : E extends object
      ? {
            [K in keyof E]: [
                K,
                ...ArrayEntityKeyOf<
                    E[K] extends Array<infer V> ? V : E[K],
                    Prev[Depth]
                >,
            ];
        }[keyof E]
      : [];
