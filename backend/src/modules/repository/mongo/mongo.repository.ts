import {
    CountQuery,
    CreateQuery,
    DeleteByIdQuery,
    DeleteManyQuery,
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
    UpdateOneQuery,
} from "@common/constant";
import { CommonQueryDto } from "@common/dto/common-query.dto";
import { ExportQueryDto } from "@common/dto/export-query.dto";
import { PageableDto } from "@common/dto/pageable.dto";
import { BaseEntity } from "@common/interface/base-entity.interface";
import { MongoUtil } from "@common/utils/mongo.util";
import { ObjectUtil } from "@common/utils/object.util";
import { CommonProviderService } from "@module/common-provider/common-provider.service";
import {
    BaseCommandOption,
    BaseQueryOption,
    BaseRepository,
    BaseRepositoryOption,
    QueryCondition,
    UpdateDocument,
} from "@module/repository/common/base-repository.interface";
import { Inject, Type } from "@nestjs/common";
import { ClientSession } from "mongodb";
import { FilterQuery, Model } from "mongoose";

export abstract class MongoRepository<E extends BaseEntity>
    implements BaseRepository<E, ClientSession>
{
    @Inject(CommonProviderService)
    public readonly cps: CommonProviderService;

    constructor(
        private readonly model: Model<E>,
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
                case "object": {
                    if (Array.isArray(key)) {
                        return { [key.join(".")]: dataPartition.ma };
                    }
                }
            }
        }
        return {};
    }

    getDataPartitionCondition(
        options: Pick<CommonQueryDto, "enableDataPartition">,
    ): Record<string, string> {
        return this.getDataPartitionRecord(options);
    }

    async create(
        document: Partial<E>,
        query?: CreateQuery<E> & BaseCommandOption<ClientSession>,
    ): Promise<E> {
        const partitionRecord = this.getDataPartitionRecord(query);
        Object.assign(document, partitionRecord);
        if (!query?.transaction) {
            return this.model.create(document);
        } else {
            const res = await this.model.create([document], {
                session: query.transaction,
            });
            return res[0];
        }
    }

    async insertMany(
        documents: Partial<E>[],
        options?: InsertManyQuery<E> & BaseCommandOption<ClientSession>,
    ): Promise<{ n: number }> {
        const partitionRecord = this.getDataPartitionRecord(options);
        const res = await this.model.insertMany(
            documents.map((doc) => Object.assign(doc, partitionRecord)),
            {
                rawResult: true,
                ordered: true,
                session: options?.transaction,
            },
        );
        return { n: res.insertedCount };
    }

    getById(
        id: string,
        query?: GetByIdQuery<E> & BaseQueryOption<ClientSession>,
    ): Promise<E> {
        const partitionCondition = this.getDataPartitionCondition(query);
        const condition = { _id: id, ...partitionCondition };
        const mongooseOptions = this.getMongooseOption(query);
        return this.model
            .findOne(condition)
            .populate<any>(
                MongoUtil.getPopulate<E>(
                    query?.population || this.option.populate?.getById,
                ),
            )
            .setOptions({ ...mongooseOptions, session: query?.transaction })
            .lean<E>({ defaults: true, getter: true, virtual: true })
            .exec();
    }

    getOne(
        conditions: FilterQuery<E>,
        query?: GetOneQuery<E> & BaseQueryOption<ClientSession>,
    ): Promise<E> {
        conditions = conditions || {};
        const partitionCondition = this.getDataPartitionCondition(query);
        Object.assign(conditions, partitionCondition);
        const mongooseOptions = this.getMongooseOption(query);
        return this.model
            .findOne(MongoUtil.getCondition(conditions, query?.filters))
            .populate<any>(
                MongoUtil.getPopulate(
                    query?.population || this.option.populate?.getOne,
                ),
            )
            .setOptions({ ...mongooseOptions, session: query?.transaction })
            .lean<E>({ defaults: true, getter: true, virtual: true })
            .exec();
    }

    getMany(
        conditions: FilterQuery<E>,
        query?: GetManyQuery<E> & BaseQueryOption<ClientSession>,
    ): Promise<E[]> {
        conditions = conditions || {};
        const partitionCondition = this.getDataPartitionCondition(query);
        Object.assign(conditions, partitionCondition);
        const mongooseOptions = this.getMongooseOption(query);
        return this.model
            .find(MongoUtil.getCondition(conditions, query?.filters))
            .populate<any>(
                MongoUtil.getPopulate(
                    query?.population || this.option.populate?.getMany,
                ),
            )
            .setOptions({ ...mongooseOptions, session: query?.transaction })
            .lean<E[]>({ defaults: true, getter: true, virtual: true })
            .exec();
    }

    async getPage(
        conditions: FilterQuery<E>,
        query?: GetPageQuery<E> & BaseQueryOption<ClientSession>,
    ): Promise<PageableDto<any>> {
        conditions = conditions || {};
        const partitionCondition = this.getDataPartitionCondition(query);
        Object.assign(conditions, partitionCondition);
        const mongooseOptions = this.getMongooseOption(query);
        const finalCondition = MongoUtil.getCondition(
            conditions,
            query?.filters,
        );
        const [total, result] = await Promise.all([
            this.count(finalCondition),
            this.model
                .find(finalCondition, undefined, mongooseOptions)
                .populate<any>(
                    MongoUtil.getPopulate(
                        query?.population || this.option.populate?.getPage,
                    ),
                )
                .setOptions({
                    session: query?.transaction,
                })
                .lean({ defaults: true, getter: true, virtual: true }),
        ]);
        return PageableDto.create(query, total, result);
    }

    async *getBatch(
        conditions: any,
        query?: GetBatchQuery<E> & BaseQueryOption<ClientSession>,
    ): AsyncGenerator<E[], undefined, undefined> {
        conditions = conditions || {};
        const partitionCondition = this.getDataPartitionCondition(query);
        Object.assign(conditions, partitionCondition);
        let previousId: string;
        const mongooseOptions = this.getMongooseOption(query);
        mongooseOptions.sort = mongooseOptions.sort || {};
        mongooseOptions.sort = Object.assign({ _id: 1 }, mongooseOptions.sort);
        while (true) {
            if (previousId) {
                Object.assign(conditions, { _id: { $gt: previousId } });
            }
            const res = await this.model
                .find(conditions)
                .populate(
                    MongoUtil.getPopulate(
                        query?.population || this.option.populate?.getBatch,
                    ),
                )
                .setOptions({
                    ...mongooseOptions,
                    session: query?.transaction,
                })
                .lean<E[]>({ defaults: true, getter: true, virtual: true });
            if (res.length > 0) {
                yield res;
                previousId = res[res.length - 1]._id;
            } else {
                return;
            }
        }
    }

    async distinct<Type extends string = string>(
        field: string,
        conditions?: any,
        query?: DistinctQuery<E> & BaseQueryOption<ClientSession>,
    ): Promise<Type[]> {
        conditions = conditions || {};
        const partitionCondition = this.getDataPartitionCondition(query);
        Object.assign(conditions, partitionCondition);
        const { transaction, filters } = query || {};
        const finalCondition = MongoUtil.getCondition(conditions, filters);
        const res = await this.model
            .distinct(field, finalCondition)
            .session(transaction);
        return res as Type[];
    }

    updateById(
        id: string,
        update: UpdateDocument<E>,
        query?: UpdateByIdQuery<E> & BaseCommandOption<ClientSession>,
    ): Promise<E> {
        const partitionCondition = this.getDataPartitionCondition(query);
        const conditions: any = { _id: id, ...partitionCondition };
        const { transaction, ...options } = query || {};
        options.new = options.new ?? true;
        return this.model
            .findOneAndUpdate(conditions, MongoUtil.getUpdate(update), {
                ...options,
                session: transaction,
            })
            .lean<E>({ defaults: true, getter: true, virtual: true })
            .exec();
    }

    updateOne(
        conditions: FilterQuery<E>,
        update: UpdateDocument<E>,
        query?: UpdateOneQuery<E> & BaseCommandOption<ClientSession>,
    ): Promise<E> {
        conditions = conditions || {};
        const partitionCondition = this.getDataPartitionCondition(query);
        Object.assign(conditions, partitionCondition);
        const { transaction, ...options } = query || {};
        options.new = options.new ?? true;
        return this.model
            .findOneAndUpdate(
                MongoUtil.getCondition(conditions, query?.filters),
                MongoUtil.getUpdate(update),
                {
                    ...options,
                    session: transaction,
                },
            )
            .lean<E>({ defaults: true, getter: true, virtual: true })
            .exec();
    }

    async updateMany(
        conditions: FilterQuery<E>,
        update: UpdateDocument<E>,
        query?: UpdateManyQuery<E> & BaseCommandOption<ClientSession>,
    ): Promise<{ n?: number; affected: number }> {
        conditions = conditions || {};
        const partitionCondition = this.getDataPartitionCondition(query);
        Object.assign(conditions, partitionCondition);
        const { transaction, ...options } = query || {};
        options.new = options.new ?? true;
        const res = await this.model.updateMany(
            MongoUtil.getCondition(conditions, query?.filters),
            MongoUtil.getUpdate(update),
            {
                ...options,
                session: transaction,
            },
        );
        const affected = res.modifiedCount + res.upsertedCount;
        return { n: res.matchedCount, affected };
    }

    async deleteById(
        id: string,
        query?: DeleteByIdQuery<E> & BaseCommandOption<ClientSession>,
    ): Promise<E> {
        const partitionCondition = this.getDataPartitionCondition(query);
        const condition = { _id: id, ...partitionCondition };
        const { transaction } = query || {};
        return this.model
            .findOneAndDelete(condition, { session: transaction })
            .lean<E>({ defaults: true, getter: true, virtual: true })
            .exec();
    }

    deleteOne(
        conditions: FilterQuery<E>,
        query?: DeleteOneQuery<E> & BaseCommandOption<ClientSession>,
    ): Promise<E> {
        conditions = conditions || {};
        const partitionCondition = this.getDataPartitionCondition(query);
        Object.assign(conditions, partitionCondition);
        const { transaction, ...options } = query || {};
        return this.model
            .findOneAndDelete(
                MongoUtil.getCondition(conditions, query?.filters),
                {
                    ...options,
                    session: transaction,
                },
            )
            .lean<E>({ defaults: true, getter: true, virtual: true })
            .exec();
    }

    async deleteMany(
        conditions: FilterQuery<E>,
        query?: DeleteManyQuery<E> & BaseCommandOption<ClientSession>,
    ): Promise<{
        n?: number;
        deleted: number;
    }> {
        conditions = conditions || {};
        const partitionCondition = this.getDataPartitionCondition(query);
        Object.assign(conditions, partitionCondition);
        const { transaction } = query || {};
        const res = await this.model.deleteMany(
            MongoUtil.getCondition(conditions, query?.filters),
            {
                session: transaction,
            },
        );
        return { deleted: res.deletedCount };
    }

    async exists(
        conditions?: FilterQuery<E>,
        query?: ExistQuery<E> & BaseQueryOption<ClientSession>,
    ): Promise<boolean> {
        conditions = conditions || {};
        const partitionCondition = this.getDataPartitionCondition(query);
        Object.assign(conditions, partitionCondition);
        const res = await this.model
            .exists(MongoUtil.getCondition(conditions, query?.filters))
            .session(query?.transaction);
        return Boolean(res?._id);
    }

    count(
        conditions?: any,
        query?: CountQuery<E> & BaseQueryOption<ClientSession>,
    ): Promise<number> {
        conditions = conditions || {};
        const partitionCondition = this.getDataPartitionCondition(query);
        Object.assign(conditions, partitionCondition);
        const finalCondition = MongoUtil.getCondition(
            conditions,
            query?.filters,
        );
        if (
            ObjectUtil.isEmptyObject(finalCondition) &&
            !this.model.baseModelName
        ) {
            return this.model
                .estimatedDocumentCount({ session: query?.transaction })
                .exec();
        } else {
            return this.model
                .countDocuments(finalCondition, { session: query?.transaction })
                .exec();
        }
    }

    getMongooseOption(query: CommonQueryDto<E>) {
        const option: Partial<CommonQueryDto<E>> = {};
        if (query) {
            Object.entries(query).forEach(([key, value]) => {
                if (["select", "sort", "skip", "limit"].includes(key)) {
                    option[key] = value;
                }
            });
        }
        return option;
    }

    async getExport(
        entity: Type<E>,
        conditions: QueryCondition<E>,
        query: CommonQueryDto<E>,
        exportQuery: ExportQueryDto & BaseQueryOption<ClientSession>,
    ): Promise<E[]> {
        conditions = conditions || {};
        const partitionCondition = this.getDataPartitionCondition(query);
        Object.assign(conditions, partitionCondition);
        query = query || {};
        query.population = query.population || this.option.populate?.getExport;
        const finalQuery = MongoUtil.getExportQuery(
            entity,
            conditions,
            query,
            exportQuery,
        );
        const { filter, populate, select } = finalQuery;
        const { transaction } = exportQuery;
        const res = await this.model
            .find(filter)
            .select(select)
            .populate(populate)
            .session(transaction)
            .lean<E[]>({ defaults: true, getter: true, virtual: true });
        return res;
    }

    getRepositoryErrors(err: Error): string[] {
        return [err.message];
    }

    async getMap(
        keys: (keyof E)[],
        condition: QueryCondition<E>,
        query?: Omit<GetMapQuery<E>, "listValue"> &
            BaseQueryOption<ClientSession>,
    ): Promise<Record<string, E>>;
    async getMap(
        keys: (keyof E)[],
        condition: QueryCondition<E>,
        query?: Omit<GetMapQuery<E>, "listValue"> &
            BaseQueryOption<ClientSession> & { listValue: true },
    ): Promise<Record<string, E[]>>;
    async getMap(
        keys: (keyof E)[],
        conditions: QueryCondition<E>,
        query?: GetMapQuery<E> & BaseQueryOption<ClientSession>,
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
