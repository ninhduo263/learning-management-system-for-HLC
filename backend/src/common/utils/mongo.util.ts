import { OperatorType } from "@common/constant";
import { EntityDefinition } from "@common/constant/class/entity-definition";
import { CommonQueryDto } from "@common/dto/common-query.dto";
import { ExportDefinitionDto } from "@common/dto/entity-definition/export-definition.dto";
import { ExportQueryDto } from "@common/dto/export-query.dto";
import { FilterItemDto } from "@common/dto/filter-item.dto";
import { PopulationDto } from "@common/dto/population.dto";
import { BaseEntity } from "@common/interface/base-entity.interface";
import {
    BaseCommandOption,
    ConditionCriteria,
    QueryCondition,
    QueryOperator,
    UpdateDocument,
    UpdateOperator,
} from "@module/repository/common/base-repository.interface";
import { Type } from "@nestjs/common";
import {
    ClientSession,
    FilterQuery,
    HydratedDocument,
    PopulateOptions,
    QueryOptions,
    UpdateQuery,
} from "mongoose";

type ExportTreeNode = {
    field: string;
    fields: string[];
    children?: string[];
    object?: boolean;
};

class MongoUtilLoader {
    convertExportQuery<E extends BaseEntity>(
        exportQuery: ExportQueryDto,
    ): {
        condition: any;
        query: QueryOptions<HydratedDocument<E>>;
    } {
        // TODO
        const condition: unknown = {};
        if (exportQuery.ids) {
            Object.assign(condition, { _id: { $in: exportQuery.ids } });
        }
        // else if (exportQuery.query) {
        //     Object.assign(condition, {});
        // }
        return {
            condition,
            query: null,
        };
    }

    getPopulate<E>(population: PopulationDto<E>[]): PopulateOptions[] {
        if (population) {
            return population.map((option) => ({
                path: option.path as string,
                select: option.fields,
                match: this.getCondition(option.condition, option.filter),
                populate: this.getPopulate(option.population),
            }));
        }
    }

    private getCriteria(value: unknown) {
        return Object.keys(value).reduce((finalValue, keyCriteria) => {
            const valueCriteria = value[keyCriteria];
            let criteria: unknown;
            switch (keyCriteria as keyof ConditionCriteria<unknown>) {
                case "$in":
                case "$nin":
                case "$eq":
                case "$ne":
                case "$gt":
                case "$gte":
                case "$lt":
                case "$lte":
                default: {
                    criteria = {
                        [keyCriteria]: valueCriteria,
                    };
                    break;
                }
                case "$exist": {
                    criteria = {
                        $exists: valueCriteria,
                    };
                    break;
                }
                case "$regex":
                case "$like": {
                    criteria = {
                        $regex: valueCriteria,
                        $options: "i",
                    };
                    break;
                }
                case "$not": {
                    criteria = {
                        $not: this.getCriteria(valueCriteria),
                    };
                    break;
                }
            }
            return Object.assign(finalValue, criteria);
        }, {});
    }

    private transformCondition<E extends BaseEntity>(
        condition: QueryCondition<E>,
    ): FilterQuery<E> {
        const res = Object.keys(condition).reduce<FilterQuery<E>>(
            (finalCondition, key) => {
                const value = condition[key];
                const operatorKey = key as keyof QueryOperator<E>;
                if (operatorKey === "$and" || operatorKey === "$or") {
                    Object.assign(finalCondition, {
                        [key]: Array.from(value as QueryCondition<E>[]).map(
                            (item) => this.transformCondition(item),
                        ),
                    });
                } else {
                    const valueType = typeof value;
                    if (
                        valueType === "boolean" ||
                        valueType === "number" ||
                        valueType === "bigint" ||
                        valueType === "string" ||
                        value instanceof Date ||
                        value == null
                    ) {
                        Object.assign(finalCondition, { [key]: value });
                    } else {
                        Object.assign(finalCondition, {
                            [key]: this.getCriteria(value),
                        });
                    }
                }
                return finalCondition;
            },
            {},
        );
        return res;
    }

    private transformFilter<E = any>(
        filters: FilterItemDto<E>[],
    ): FilterQuery<E>[] {
        const res = filters
            .map((filter) => {
                const field =
                    typeof filter.field === "string"
                        ? filter.field
                        : Array.isArray(filter.field)
                          ? `${filter.field?.join(".")}`
                          : filter.field?.toString();
                let component: any;
                switch (filter.operator) {
                    case OperatorType.CONTAIN: {
                        component = {
                            [field]: {
                                $regex: filter.values?.[0],
                                $options: "i",
                            },
                        };
                        break;
                    }
                    case OperatorType.NOT_CONTAIN: {
                        component = {
                            [field]: {
                                $not: {
                                    $regex: filter.values?.[0],
                                    $options: "i",
                                },
                            },
                        };
                        break;
                    }
                    case OperatorType.START_WITH: {
                        component = {
                            [field]: {
                                $regex: `^${filter.values?.[0]?.toString()}`,
                                $options: "i",
                            },
                        };
                        break;
                    }
                    case OperatorType.END_WITH: {
                        component = {
                            [field]: {
                                $regex: `${filter.values?.[0]?.toString()}$`,
                                $options: "i",
                            },
                        };
                        break;
                    }
                    case OperatorType.EQUAL: {
                        component = { [field]: filter.values?.[0] };
                        break;
                    }
                    case OperatorType.NOT_EQUAL: {
                        component = { [field]: { $ne: filter.values?.[0] } };
                        break;
                    }
                    case OperatorType.LESS_EQUAL: {
                        component = { [field]: { $lte: filter.values?.[0] } };
                        break;
                    }
                    case OperatorType.LESS_THAN: {
                        component = { [field]: { $lt: filter.values?.[0] } };
                        break;
                    }
                    case OperatorType.GREAT_EQUAL: {
                        component = { [field]: { $gte: filter.values?.[0] } };
                        break;
                    }
                    case OperatorType.GREAT_THAN: {
                        component = { [field]: { $gt: filter.values?.[0] } };
                        break;
                    }
                    case OperatorType.BETWEEN: {
                        component = {
                            [field]: {
                                $gte: filter.values?.[0],
                                $lte: filter.values?.[1],
                            },
                        };
                        break;
                    }
                    case OperatorType.NOT_BETWEEN: {
                        component = {
                            [field]: {
                                $not: {
                                    $gte: filter.values?.[0],
                                    $lte: filter.values?.[1],
                                },
                            },
                        };
                        break;
                    }
                    case OperatorType.INCLUDE: {
                        component = {
                            [field]: {
                                $in: filter.values,
                            },
                        };
                        break;
                    }
                    case OperatorType.NOT_INCLUDE: {
                        component = {
                            [field]: {
                                $nin: filter.values,
                            },
                        };
                        break;
                    }
                    case OperatorType.NOT_NULL: {
                        component = {
                            [field]: {
                                $exists: true,
                                $ne: null,
                            },
                        };
                        break;
                    }
                    case OperatorType.NULL: {
                        component = {
                            $or: [
                                {
                                    [field]: {
                                        $exists: false,
                                    },
                                },
                                { [field]: null },
                            ],
                        };
                        break;
                    }
                    case OperatorType.LIKE: {
                        component = {
                            [field]: {
                                $regex: filter.values?.[0],
                                $options: "i",
                            },
                        };
                        break;
                    }
                    case OperatorType.NOT_LIKE: {
                        component = {
                            [field]: {
                                $not: {
                                    $regex: filter.values?.[0],
                                    $options: "i",
                                },
                            },
                        };
                        break;
                    }
                    case OperatorType.AND: {
                        const nestedFilters = this.transformFilter(
                            filter.filters,
                        );
                        if (nestedFilters.length > 0) {
                            component = {
                                $and: nestedFilters,
                            };
                        }
                        break;
                    }
                    case OperatorType.OR: {
                        const nestedFilters = this.transformFilter(
                            filter.filters,
                        );
                        if (nestedFilters.length > 0) {
                            component = {
                                $or: nestedFilters,
                            };
                        }
                        break;
                    }
                    default: {
                        break;
                    }
                }
                return component;
            })
            .filter(Boolean);
        return res;
    }

    getCondition<E extends BaseEntity>(
        condition: QueryCondition<E>,
        filters?: CommonQueryDto<E>["filters"],
    ): FilterQuery<E> {
        const transformCondition = this.transformCondition(condition || {});
        const transformFilter = this.transformFilter(filters || []);
        const filterList = [transformCondition, ...transformFilter];
        let res: FilterQuery<E>;
        if (filterList.length === 0) {
            res = {};
        } else if (filterList.length === 1) {
            res = filterList[0];
        } else {
            res = { $and: filterList };
        }
        // console.log(JSON.stringify(res, null, 2));
        return res;
    }

    getUpdate<E extends BaseEntity>(update: UpdateDocument<E>): UpdateQuery<E> {
        const res = Object.keys(update).reduce<UpdateQuery<E>>(
            (finalUpdate, key) => {
                const updateValue = update[key];
                let updateOperator: unknown;
                switch (key as keyof UpdateOperator<E>) {
                    case "$inc": {
                        updateOperator = { $inc: updateValue };
                        break;
                    }
                    default: {
                        updateOperator = { [key]: updateValue };
                        break;
                    }
                }
                return Object.assign(finalUpdate, updateOperator);
            },
            {},
        );
        return res;
    }

    getExportQuery<E extends BaseEntity>(
        entity: Type<E>,
        condition: any,
        query: CommonQueryDto<E>,
        exportQuery: ExportQueryDto & BaseCommandOption<ClientSession>,
    ) {
        let filter: FilterQuery<E> = {};
        if (exportQuery.ids) {
            filter = { _id: { $in: exportQuery.ids } };
        } else {
            filter = this.getCondition(condition, query.filters);
        }

        const exportDefinition = EntityDefinition.getExportDefinition(entity);
        const mapDefinition: Record<string, ExportDefinitionDto> = {};
        const dfsSystemDefinition = (item: ExportDefinitionDto) => {
            mapDefinition[item.fields.join("/")] = item;
            item.children?.forEach(dfsSystemDefinition);
        };
        exportDefinition.forEach(dfsSystemDefinition);

        const tree: {
            [field: string]: ExportTreeNode;
        } = {};

        exportQuery.definitions.forEach((def) => {
            def.fields.forEach((field, index) => {
                const fields = def.fields.slice(0, index + 1);
                const key = fields.join("/");
                const systemDef = mapDefinition[key];
                if (!(key in tree)) {
                    tree[key] = { field, fields, object: systemDef.object };
                }

                if (fields.length > 1) {
                    const parentKey = fields.slice(0, -1).join("/");
                    tree[parentKey].children = tree[parentKey].children || [];
                    tree[parentKey].children.push(key);
                }
            });
        });
        const treeRoot: ExportTreeNode = {
            field: null,
            fields: [],
            children: Object.entries(tree)
                .filter((item) => item[1].fields.length === 1)
                .map((item) => item[0]),
        };

        const dfs = (node: ExportTreeNode): PopulateOptions => {
            const select: string[] = [];
            const populate: PopulateOptions[] = [];
            node.children.forEach((child) => {
                const childNode = tree[child];
                if (childNode) {
                    if (!childNode.object) {
                        if (childNode.children) {
                            const populateChild: PopulateOptions = {
                                path: childNode.field,
                                ...dfs(childNode),
                            };
                            populate.push(populateChild);
                        } else {
                            select.push(childNode.field);
                        }
                    } else {
                        select.push(childNode.field);
                    }
                }
            });
            const res = {} as PopulateOptions;
            if (select.length > 0) {
                res.select = select;
            }
            if (populate.length > 0) {
                res.populate = populate;
            }
            return res;
        };
        const populate = this.getPopulate<E>(query?.population || []);
        const populateNodes = dfs(treeRoot);
        populate.push(...((populateNodes.populate as PopulateOptions[]) || []));
        const select = populateNodes.select as string[];
        return { filter, select, populate };
    }
}

export const MongoUtil: MongoUtilLoader =
    global.MongoUtil || (global.MongoUtil = new MongoUtilLoader());
