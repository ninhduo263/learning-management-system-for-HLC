import {
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
import { ImportError } from "@common/constant/class/import-error";
import { CommonQueryDto } from "@common/dto/common-query.dto";
import { ExportQueryDto } from "@common/dto/export-query.dto";
import { PageableDto } from "@common/dto/pageable.dto";
import { BaseEntity } from "@common/interface/base-entity.interface";
import { ObjectUtil } from "@common/utils/object.util";
import { SqlUtil } from "@common/utils/sql.ulti";
import { CommonProviderService } from "@module/common-provider/common-provider.service";
import { Inject, Type } from "@nestjs/common";
import {
    BaseError,
    DatabaseError,
    FindAttributeOptions,
    Op,
    Transaction,
    ValidationError,
    col,
    fn,
} from "sequelize";
import { Model, ModelCtor } from "sequelize-typescript";
import {
    BaseCommandOption,
    BaseQueryOption,
    BaseRepository,
    BaseRepositoryOption,
    CreateDocument,
    QueryCondition,
} from "../common/base-repository.interface";

export abstract class SqlRepository<E extends BaseEntity>
    implements BaseRepository<E, Transaction>
{
    @Inject(CommonProviderService)
    public readonly cps: CommonProviderService;

    constructor(
        private readonly model: ModelCtor<Model<E>>,
        private readonly option: BaseRepositoryOption<E> = {},
    ) {}

    getDataPartitionRecord(
        options: Pick<CommonQueryDto, "enableDataPartition">,
    ): Record<string, string> {
        if (options?.enableDataPartition === false) {
            return {};
        }
        const dataPartition = this.cps.dpiService.getClsDataPartition();
        if (dataPartition) {
            const key = this.option.dataPartition?.mapping;
            switch (typeof key) {
                case "string": {
                    return { [key]: dataPartition.ma };
                }
            }
        }
        return {};
    }

    getDataPartitionCondition(
        options: Pick<CommonQueryDto, "enableDataPartition">,
    ): Record<string, string> {
        if (options?.enableDataPartition === false) {
            return {};
        }
        const dataPartition = this.cps.dpiService.getClsDataPartition();
        if (dataPartition) {
            const key = this.option.dataPartition?.mapping;
            switch (typeof key) {
                case "string": {
                    return { [key]: dataPartition.ma };
                }
                case "object": {
                    if (Array.isArray(key)) {
                        return { [`$${key.join(".")}$`]: dataPartition.ma };
                    }
                }
            }
        }
        return {};
    }

    async create(
        document: CreateDocument<E>,
        query?: CreateQuery<E> & BaseCommandOption<Transaction>,
    ): Promise<E> {
        const partitionRecord = this.getDataPartitionRecord(query);
        Object.assign(document, partitionRecord);
        const res = await this.model.create(document as any, {
            transaction: query?.transaction,
            include: SqlUtil.getIncludeable(query?.population),
        });
        return res.toJSON();
    }

    async insertMany(
        documents: Partial<E>[],
        options?: InsertManyQuery<E> & BaseCommandOption<Transaction>,
    ): Promise<{ n: number }> {
        const partitionRecord = this.getDataPartitionRecord(options);
        const res = await this.model.bulkCreate(
            documents.map((doc) => Object.assign(doc, partitionRecord) as any),
            { transaction: options?.transaction },
        );
        return { n: res.length };
    }

    async getById(
        id: string,
        query?: GetByIdQuery<E> & BaseQueryOption<Transaction>,
    ): Promise<E> {
        const include = SqlUtil.getIncludeable(
            query?.population || this.option?.populate?.getById,
        );
        const partitionCondition = this.getDataPartitionCondition(query);
        const condition = { _id: id, ...partitionCondition } as any;
        const attributes = SqlUtil.getAttributes(query?.select, include);
        const res = await this.model.findOne({
            include,
            attributes,
            where: condition,
            transaction: query?.transaction,
        });
        return res?.toJSON() || null;
    }

    async getOne(
        conditions: QueryCondition<E>,
        query?: GetOneQuery<E> & BaseQueryOption<Transaction>,
    ): Promise<E> {
        conditions = conditions || {};
        const partitionCondition = this.getDataPartitionCondition(query);
        Object.assign(conditions, partitionCondition);
        const include = SqlUtil.getIncludeable(
            query?.population || this.option?.populate?.getOne,
        );
        const attributes = SqlUtil.getAttributes(query?.select, include);
        const res = await this.model.findOne({
            include,
            attributes,
            where: SqlUtil.getCondition(conditions, query?.filters),
            order: SqlUtil.getOrder(query?.sort),
            transaction: query?.transaction,
        });
        return res?.toJSON() || null;
    }

    async getMany(
        conditions: QueryCondition<E>,
        query?: GetManyQuery<E> & BaseQueryOption<Transaction>,
    ): Promise<E[]> {
        conditions = conditions || {};
        const partitionCondition = this.getDataPartitionCondition(query);
        Object.assign(conditions, partitionCondition);
        const include = SqlUtil.getIncludeable(
            query?.population || this.option?.populate?.getMany,
        );
        const attributes = SqlUtil.getAttributes(query?.select, include);
        const res = await this.model.findAll({
            where: SqlUtil.getCondition(conditions, query?.filters),
            include,
            attributes,
            order: SqlUtil.getOrder(query?.sort),
            transaction: query?.transaction,
        });
        return res.map((doc) => doc.toJSON());
    }

    async getPage(
        conditions: QueryCondition<E>,
        query?: GetPageQuery<E> & BaseQueryOption<Transaction>,
    ): Promise<PageableDto<E>> {
        conditions = conditions || {};
        const partitionCondition = this.getDataPartitionCondition(query);
        Object.assign(conditions, partitionCondition);
        const populate = query?.population || this.option?.populate?.getPage;
        const include = SqlUtil.getIncludeable(populate);
        const attributes = SqlUtil.getAttributes(query?.select, include);
        const [rows, count] = await Promise.all([
            await this.model
                .findAll({
                    where: SqlUtil.getCondition(conditions, query?.filters),
                    include,
                    attributes,
                    offset: query?.skip,
                    limit: query?.limit,
                    order: SqlUtil.getOrder(query?.sort),
                    // subQuery: false,
                })
                .then((list) => list.map((row) => row.toJSON())),
            await this.model.count({
                where: SqlUtil.getCondition(conditions, query?.filters),
                include: SqlUtil.getIncludeable(populate),
                transaction: query?.transaction,
                col: this.model.primaryKeyAttribute,
                distinct: true,
            }),
        ]);
        return PageableDto.create(query, count, rows as any[]);
    }

    async *getBatch(
        conditions: any,
        query?: GetBatchQuery<E> & BaseQueryOption<Transaction>,
    ): AsyncGenerator<E[], E[], string> {
        conditions = conditions || {};
        const partitionCondition = this.getDataPartitionCondition(query);
        Object.assign(conditions, partitionCondition);
        let previousId: string;
        while (true) {
            if (previousId) {
                Object.assign(conditions, { _id: { [Op.gt]: previousId } });
            }
            const include = SqlUtil.getIncludeable(
                query?.population || this.option?.populate?.getBatch,
            );
            const attributes = SqlUtil.getAttributes(query?.select, include);
            const res = await this.model
                .findAll({
                    where: conditions,
                    include,
                    attributes,
                    limit: query?.limit,
                    order: [["_id", "ASC"]],
                    transaction: query?.transaction,
                })
                .then((list) => list.map((row) => row.toJSON()));
            if (res.length > 0) {
                yield res as any[];
                previousId = res[res.length - 1]._id;
            } else {
                return;
            }
        }
    }

    async distinct<Type = any>(
        field: string,
        conditions?: QueryCondition<E>,
        query?: DistinctQuery<E> & BaseQueryOption<Transaction>,
    ): Promise<Type[]> {
        conditions = conditions || {};
        const partitionCondition = this.getDataPartitionCondition(query);
        Object.assign(conditions, partitionCondition);
        const { transaction, filters, population } = query || {};
        const finalCondition = SqlUtil.getCondition(conditions, filters);
        const distintField = "_distinct_field";
        const attributes: FindAttributeOptions = [
            [fn("DISTINCT", col(field)), distintField],
        ];
        if (population) {
            attributes.push(this.model.primaryKeyAttribute);
        }
        return this.model
            .findAll({
                where: finalCondition,
                transaction,
                include: SqlUtil.getIncludeable(population),
                attributes,
            })
            .then((list) =>
                Array.from(
                    new Set(
                        list.map((item) => {
                            return item.get(distintField) as Type;
                        }),
                    ),
                ),
            );
    }

    async updateById(
        id: string,
        update: Partial<CreateDocument<E>>,
        query?: UpdateByIdQuery<E> & BaseCommandOption<Transaction>,
    ): Promise<E> {
        const partitionCondition = this.getDataPartitionCondition(query);
        const conditions: any = { _id: id, ...partitionCondition };
        query = query || {};
        query.new = query.new ?? true;
        update = SqlUtil.getUpdate(update);
        let res: Model<E, E>;
        if (
            query.upsert === true &&
            ObjectUtil.isEmptyObject(partitionCondition)
        ) {
            const doc = Object.assign<any, Partial<CreateDocument<E>>>(
                { _id: id },
                update,
            );
            [res] = await this.model.upsert(doc, {
                conflictFields: Object.keys(conditions) as Array<keyof E>,
                conflictWhere: conditions,
                transaction: query.transaction,
            });
        } else {
            const doc = await this.model.findOne({
                where: { _id: id as any },
                transaction: query.transaction,
            });
            if (doc) {
                res = await doc.update(update, {
                    transaction: query.transaction,
                });
            }
        }
        if (res) {
            return query.new === true ? res.toJSON() : (res.toJSON() as E);
        }
        return null;
    }

    async updateOne(
        conditions: QueryCondition<E>,
        update: Partial<CreateDocument<E>>,
        query?: UpdateOneQuery<E> & BaseCommandOption<Transaction>,
    ): Promise<E> {
        conditions = conditions || {};
        const partitionCondition = this.getDataPartitionCondition(query);
        Object.assign(conditions, partitionCondition);
        query = query || {};
        query.new = query.new ?? true;
        update = SqlUtil.getUpdate(update);
        let res: Model<E, E>;
        const finalCondition = SqlUtil.getCondition<E>(
            conditions,
            query.filters,
        );
        if (query.upsert === true) {
            const doc = Object.assign({}, finalCondition, update) as any;
            [res] = await this.model.upsert(doc as any, {
                conflictFields: Object.keys(finalCondition) as Array<keyof E>,
                conflictWhere: finalCondition,
                transaction: query.transaction,
            });
        } else {
            const doc = await this.model.findOne({
                where: finalCondition,
                transaction: query.transaction,
                order: SqlUtil.getOrder(query.sort),
            });
            if (doc) {
                res = await doc.update(update, {
                    transaction: query.transaction,
                });
            }
        }
        if (res) {
            return query.new === true ? res.toJSON() : (res.toJSON() as E);
        }
        return null;
    }

    async updateMany(
        conditions: QueryCondition<E>,
        update: any,

        query?: UpdateManyQuery<E> & BaseCommandOption<Transaction>,
    ): Promise<UpdateManyResult> {
        conditions = conditions || {};
        const partitionCondition = this.getDataPartitionCondition(query);
        Object.assign(conditions, partitionCondition);
        query = query || {};
        query.new = query.new ?? true;
        update = SqlUtil.getUpdate(update);
        const finalCondition = SqlUtil.getCondition(conditions, query.filters);
        const res = await this.model.update(update, {
            where: finalCondition,
            transaction: query.transaction,
        });
        return { n: res.length, affected: res.length };
    }

    async deleteById(
        id: string,
        query?: DeleteByIdQuery<E> & BaseCommandOption<Transaction>,
    ): Promise<E> {
        const partitionCondition = this.getDataPartitionCondition(query);
        const condition = { _id: id, ...partitionCondition } as any;

        const res = await this.model.findOne({
            where: condition,
            transaction: query?.transaction,
        });
        if (res) {
            await res.destroy({
                transaction: query?.transaction,
            });
            return res.toJSON();
        }
        return null;
    }

    async deleteOne(
        conditions: QueryCondition<E>,
        query?: DeleteOneQuery<E> & BaseCommandOption<Transaction>,
    ): Promise<E> {
        conditions = conditions || {};
        const partitionCondition = this.getDataPartitionCondition(query);
        Object.assign(conditions, partitionCondition);
        const finalCondition = SqlUtil.getCondition(conditions, query?.filters);
        const res = await this.model.findOne({
            where: finalCondition,
            order: SqlUtil.getOrder(query?.sort),
            transaction: query?.transaction,
        });
        if (res) {
            await res.destroy({ transaction: query?.transaction });
            return res.toJSON();
        }
        return null;
    }

    async deleteMany(
        conditions: QueryCondition<E>,
        query?: DeleteManyQuery<E> & BaseCommandOption<Transaction>,
    ): Promise<DeleteManyResult> {
        conditions = conditions || {};
        const partitionCondition = this.getDataPartitionCondition(query);
        Object.assign(conditions, partitionCondition);
        const finalCondition = SqlUtil.getCondition(conditions, query?.filters);
        const res = await this.model.destroy({
            where: finalCondition,
            transaction: query?.transaction,
        });
        return {
            n: res,
            deleted: res,
        };
    }

    async exists(
        conditions?: QueryCondition<E>,
        query?: ExistQuery<E> & BaseQueryOption<Transaction>,
    ): Promise<boolean> {
        conditions = conditions || {};
        const partitionCondition = this.getDataPartitionCondition(query);
        Object.assign(conditions, partitionCondition);
        const finalCondition = SqlUtil.getCondition(conditions, query?.filters);
        const res = await this.model.findOne({
            where: finalCondition,
            attributes: { include: ["_id"] },
            transaction: query?.transaction,
        });
        return !!res;
    }

    count(
        conditions?: QueryCondition<E>,
        query?: CountQuery<E> & BaseQueryOption<Transaction>,
    ): Promise<number> {
        conditions = conditions || {};
        const partitionCondition = this.getDataPartitionCondition(query);
        Object.assign(conditions, partitionCondition);
        const finalCondition = SqlUtil.getCondition(conditions, query?.filters);
        return this.model.count({
            where: finalCondition,
            transaction: query?.transaction,
            include: SqlUtil.getIncludeable(query?.population),
            col: this.model.primaryKeyAttribute,
            distinct: true,
        });
    }

    async getExport(
        entity: Type<E>,
        conditions: QueryCondition<E>,
        query: CommonQueryDto<E>,
        exportQuery: ExportQueryDto & BaseQueryOption<Transaction>,
    ): Promise<E[]> {
        conditions = conditions || {};
        const partitionCondition = this.getDataPartitionCondition(query);
        Object.assign(conditions, partitionCondition);
        query = query || {};
        query.population = query.population || this.option.populate?.getExport;
        const finalQuery = SqlUtil.getExportQuery(
            entity,
            conditions,
            query,
            exportQuery,
        );
        const res = await this.model.findAll(finalQuery);
        return res.map((doc) => doc.toJSON());
    }

    getRepositoryErrors(err: Error): string[] {
        let defaultErrors: string[];
        if (err instanceof ImportError) {
            defaultErrors = err.getMessages();
        } else if (err instanceof ValidationError) {
            defaultErrors = err.errors.map((e) => e.message);
        } else if (err instanceof DatabaseError) {
            defaultErrors = [err.original.message];
        } else if (err instanceof BaseError) {
            defaultErrors = [err.name];
        } else {
            defaultErrors = [err.message];
        }
        return defaultErrors;
    }

    async getMap(
        keys: (keyof E)[],
        condition: QueryCondition<E>,
        query?: Omit<GetMapQuery<E>, "listValue"> &
            BaseQueryOption<Transaction> & {
                listValue: false | undefined | null;
            },
    ): Promise<Record<string, E>>;
    async getMap(
        keys: (keyof E)[],
        condition: QueryCondition<E>,
        query?: Omit<GetMapQuery<E>, "listValue"> &
            BaseQueryOption<Transaction> & { listValue: true },
    ): Promise<Record<string, E[]>>;
    async getMap(
        keys: (keyof E)[],
        conditions: QueryCondition<E>,
        query?: Pick<
            CommonQueryDto<E>,
            "select" | "sort" | "filters" | "population" | "enableDataPartition"
        > & {
            separator?: string;
            listValue?: boolean;
        } & BaseQueryOption<Transaction>,
    ): Promise<Record<string, E | E[]>> {
        conditions = conditions || {};
        query ??= {};
        const partitionCondition = this.getDataPartitionCondition(query);
        Object.assign(conditions, partitionCondition);
        const list = await this.getMany(conditions, query);
        const separator = query.separator || ",";
        return list.reduce<Record<string, E | E[]>>((map, item) => {
            const dataKeys = keys.map((key) => item[key]).join(separator);
            if (!query.listValue) {
                return Object.assign(map, {
                    [dataKeys]: item,
                });
            } else {
                map[dataKeys] ??= [];
                (map[dataKeys] as E[]).push(item);
                return map;
            }
        }, {});
    }
}
