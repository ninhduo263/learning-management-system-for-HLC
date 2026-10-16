import { OperatorType } from "@common/constant";
import { EntityDefinition } from "@common/constant/class/entity-definition";
import { CommonQueryDto } from "@common/dto/common-query.dto";
import { ExportDefinitionQueryDto } from "@common/dto/entity-definition/export-definition-query.dto";
import { ExportDefinitionDto } from "@common/dto/entity-definition/export-definition.dto";
import { ExportQueryDto } from "@common/dto/export-query.dto";
import { FilterItemDto } from "@common/dto/filter-item.dto";
import { BaseEntity } from "@common/interface/base-entity.interface";
import {
    BaseCommandOption,
    ConditionCriteria,
    QueryCondition,
    QueryOperator,
    UpdateOperator,
} from "@module/repository/common/base-repository.interface";
import { Type } from "@nestjs/common";
import { FilterQuery } from "mongoose";
import {
    FindOptions,
    IncludeOptions,
    Includeable,
    Op,
    Order,
    Transaction,
    WhereOptions,
    literal,
} from "sequelize";
import { StringUtil } from "./string.util";

type ExportTreeNode = {
    field: string;
    fields: string[];
    children?: string[];
    hasMany?: boolean;
    object?: boolean;
};
class SqlUtilLoader {
    getAttributes(
        select: CommonQueryDto["select"],
        includes: Includeable[],
    ):
        | {
              exclude: string[];
          }
        | string[] {
        if (includes?.some((item: IncludeOptions) => item.separate)) {
            return undefined;
        }
        select = select || {};
        const include = Object.entries(select).filter((item) => item[1] === 1);
        const exclude = Object.entries(select).filter((item) => item[1] === 0);
        if (include.length > 0) {
            return include.map((item) => item[0]);
        }
        const res = { exclude: exclude.map((item) => item[0]) };
        return res;
    }

    getOrder(sort: CommonQueryDto["sort"]): Order {
        sort = sort || {};
        const res: Order = Object.entries(sort).map((item) => {
            if (item[1] === -1) {
                return [item[0], "DESC"];
            } else {
                return [item[0], "ASC"];
            }
        });
        return res;
    }

    getIncludeable<E>(
        population: CommonQueryDto<E>["population"],
    ): Includeable[] {
        population = population || [];
        return population.map((p) => {
            const includes = this.getIncludeable(p.population);
            const where = this.getCondition(p.condition, p.filter);
            const attributes = this.getAttributes(p.fields, includes);
            const include: Includeable = {
                association: p.path as string,
                include: includes,
                attributes,
                where,
                required: p.required ?? false,
                separate: p.hasMany,
            };
            if (!include.include) {
                delete include.include;
            }
            return include;
        });
    }

    private getCriteria(value: unknown) {
        return Object.keys(value).reduce((finalValue, keyCriteria) => {
            const valueCriteria = value[keyCriteria];
            let criteria: unknown;
            switch (keyCriteria as keyof ConditionCriteria<unknown>) {
                case "$in": {
                    criteria = {
                        [Op.in]: valueCriteria,
                    };
                    break;
                }
                case "$nin": {
                    criteria = {
                        [Op.notIn]: valueCriteria,
                    };
                    break;
                }
                case "$eq": {
                    criteria = {
                        [Op.eq]: valueCriteria,
                    };
                    break;
                }
                case "$ne": {
                    switch (typeof valueCriteria) {
                        case "boolean": {
                            criteria = {
                                [Op.not]: valueCriteria,
                            };
                            break;
                        }
                        default: {
                            criteria = {
                                [Op.is]: literal(
                                    `distinct from ${this.getRawValue(valueCriteria)}`,
                                ),
                            };
                            break;
                        }
                    }
                    break;
                }
                case "$gt": {
                    criteria = {
                        [Op.gt]: valueCriteria,
                    };
                    break;
                }
                case "$gte": {
                    criteria = {
                        [Op.gte]: valueCriteria,
                    };
                    break;
                }
                case "$lt": {
                    criteria = {
                        [Op.lt]: valueCriteria,
                    };
                    break;
                }
                case "$lte": {
                    criteria = {
                        [Op.lte]: valueCriteria,
                    };
                    break;
                }
                case "$exist": {
                    if (valueCriteria) {
                        criteria = {
                            [Op.not]: null,
                        };
                    } else {
                        criteria = {
                            [Op.is]: null,
                        };
                    }
                    break;
                }
                case "$like": {
                    criteria = {
                        [Op.iLike]: valueCriteria,
                    };
                    break;
                }
                case "$regex": {
                    criteria = {
                        [Op.iRegexp]: valueCriteria,
                    };
                    break;
                }
                case "$not": {
                    criteria = {
                        [Op.not]: this.getCriteria(valueCriteria),
                    };
                    break;
                }
                default: {
                    criteria = {
                        [keyCriteria]: valueCriteria,
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
                const value = condition[key] ?? null;
                switch (key as keyof QueryOperator<E>) {
                    case "$and": {
                        Object.assign(finalCondition, {
                            [Op.and]: Array.from(
                                value as QueryCondition<E>[],
                            ).map((item) => this.transformCondition(item)),
                        });
                        break;
                    }
                    case "$or": {
                        Object.assign(finalCondition, {
                            [Op.or]: Array.from(
                                value as QueryCondition<E>[],
                            ).map((item) => this.transformCondition(item)),
                        });
                        break;
                    }
                    default: {
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
                }
                return finalCondition;
            },
            {},
        );
        return res;
    }

    private transformFilter<E = any>(
        filters: FilterItemDto<E>[],
    ): WhereOptions<E>[] {
        const res = filters
            .map((item) => {
                const field =
                    typeof item.field === "string"
                        ? item.field
                        : Array.isArray(item.field)
                          ? `$${item.field.join(".")}$`
                          : item.field?.toString();
                let component: any;
                const firstValue = item.values?.[0] ?? null;
                const values = item.values || [];
                const regex = firstValue?.toString()
                    ? StringUtil.regexMatch(firstValue?.toString())
                    : item.values?.[0]?.toString();

                switch (item.operator) {
                    case OperatorType.CONTAIN: {
                        component = {
                            [field]: {
                                [Op.iRegexp]: regex,
                            },
                        };
                        break;
                    }
                    case OperatorType.NOT_CONTAIN: {
                        component = {
                            [field]: {
                                [Op.notIRegexp]: regex,
                            },
                        };
                        break;
                    }
                    case OperatorType.START_WITH: {
                        component = {
                            [field]: {
                                [Op.iRegexp]: (regex && `^${regex}`) ?? null,
                            },
                        };
                        break;
                    }
                    case OperatorType.END_WITH: {
                        component = {
                            [field]: {
                                [Op.iRegexp]: (regex && `${regex}$`) ?? null,
                            },
                        };
                        break;
                    }
                    case OperatorType.EQUAL: {
                        component = { [field]: { [Op.eq]: firstValue } };
                        break;
                    }
                    case OperatorType.NOT_EQUAL: {
                        switch (typeof firstValue) {
                            case "boolean": {
                                component = {
                                    [field]: { [Op.not]: firstValue },
                                };
                                break;
                            }
                            default: {
                                component = {
                                    [field]: {
                                        [Op.is]: literal(
                                            `distinct from ${this.getRawValue(firstValue)}`,
                                        ),
                                    },
                                };
                                break;
                            }
                        }
                        break;
                    }
                    case OperatorType.LESS_EQUAL: {
                        component = { [field]: { [Op.lte]: firstValue } };
                        break;
                    }
                    case OperatorType.LESS_THAN: {
                        component = { [field]: { [Op.lt]: firstValue } };
                        break;
                    }
                    case OperatorType.GREAT_EQUAL: {
                        component = { [field]: { [Op.gte]: firstValue } };
                        break;
                    }
                    case OperatorType.GREAT_THAN: {
                        component = { [field]: { [Op.gt]: firstValue } };
                        break;
                    }
                    case OperatorType.BETWEEN: {
                        component = {
                            [field]: {
                                [Op.between]: values,
                            },
                        };
                        break;
                    }
                    case OperatorType.NOT_BETWEEN: {
                        component = {
                            [field]: {
                                [Op.notBetween]: values,
                            },
                        };
                        break;
                    }
                    case OperatorType.INCLUDE: {
                        component = {
                            [field]: {
                                [Op.in]: values,
                            },
                        };
                        break;
                    }
                    case OperatorType.NOT_INCLUDE: {
                        component = {
                            [field]: {
                                [Op.notIn]: values,
                            },
                        };
                        break;
                    }
                    case OperatorType.NOT_NULL: {
                        component = {
                            [field]: {
                                [Op.not]: null,
                            },
                        };
                        break;
                    }
                    case OperatorType.NULL: {
                        component = {
                            [field]: {
                                [Op.is]: null,
                            },
                        };
                        break;
                    }
                    case OperatorType.LIKE: {
                        component = {
                            [field]: {
                                [Op.like]: firstValue,
                            },
                        };
                        break;
                    }
                    case OperatorType.NOT_LIKE: {
                        component = {
                            [field]: {
                                [Op.notLike]: firstValue,
                            },
                        };
                        break;
                    }
                    case OperatorType.AND: {
                        const nestedFilters = this.transformFilter(
                            item.filters,
                        );
                        if (nestedFilters.length > 0) {
                            component = {
                                [Op.and]: nestedFilters,
                            };
                        }
                        break;
                    }
                    case OperatorType.OR: {
                        const nestedFilters = this.transformFilter(
                            item.filters,
                        );
                        if (nestedFilters.length > 0) {
                            component = {
                                [Op.or]: nestedFilters,
                            };
                        }
                        break;
                    }
                    default: {
                        component = {
                            [field]: firstValue,
                        };
                        break;
                    }
                }
                return component;
            })
            .filter(Boolean);
        return res;
    }

    // TODO: Update base;
    getCondition<E>(
        condition: QueryCondition<E>,
        filters: CommonQueryDto<E>["filters"],
    ): WhereOptions<E> {
        const transformCondition = this.transformCondition(condition || {});
        const transformFilter = this.transformFilter(filters || []);
        const filterList = [transformCondition, ...transformFilter];
        let res: WhereOptions<E>;
        if (filterList.length === 0) {
            res = {};
        } else if (filterList.length === 1) {
            res = filterList[0];
        } else {
            res = { [Op.and]: filterList };
        }
        // console.log(JSON.stringify(res, null, 2));
        return res;
    }

    private convertInclude(
        definition: ExportDefinitionQueryDto,
        index = 0,
    ): Includeable {
        if (index + 1 > definition.fields.length) {
            return null;
        }
        const res: Includeable = { association: definition.fields[index] };
        res.include = [this.convertInclude(definition, index + 1)].filter(
            Boolean,
        );
        return res;
    }

    getUpdate<E extends BaseEntity>(update: unknown) {
        const res = Object.keys(update).reduce((finalUpdate, key) => {
            const updateValue = update[key];
            let updateOperator: unknown;
            switch (key as keyof UpdateOperator<E>) {
                case "$inc": {
                    updateOperator = Object.keys(updateValue).reduce(
                        (op, field) => {
                            op[field] = literal(
                                `"${field}" + ${updateValue[field]}`,
                            );
                            return op;
                        },
                        {},
                    );
                    break;
                }
                default: {
                    updateOperator = { [key]: updateValue };
                    break;
                }
            }
            return Object.assign(finalUpdate, updateOperator);
        }, {});
        return res;
    }

    private getRawValue(value: unknown) {
        if (value == null) {
            return "NULL";
        }
        switch (typeof value) {
            case "bigint":
            case "boolean":
            case "number": {
                return value.toString();
            }
            case "string":
            case "symbol": {
                return `'${String(value)}'`;
            }
            case "object": {
                if (Array.isArray(value)) {
                    return `(${value.map((item) => this.getRawValue(item))})`;
                }
                return "NULL";
            }
            default: {
                return "NULL";
            }
        }
    }

    conditionToListRawQuery(condition: unknown) {
        condition = condition || {};
        return Object.keys(condition).map(
            (map, key) => `"${key}" = ${this.getRawValue(condition[key])}`,
        );
    }

    filterToListRawQuery(filter: FilterItemDto[]) {
        filter = filter || [];
        return filter
            .map((item) => {
                switch (item.operator) {
                    case OperatorType.START_WITH: {
                        return `"${String(item.field)}" ilike ${this.getRawValue(`${String(item.values?.[0])}%`)}`;
                    }
                    case OperatorType.END_WITH: {
                        return `"${String(item.field)}" ilike ${this.getRawValue(`%${String(item.values?.[0])}`)}`;
                    }
                    case OperatorType.CONTAIN: {
                        return `"${String(item.field)}" ilike ${this.getRawValue(`%${String(item.values?.[0])}%`)}`;
                    }
                    case OperatorType.NOT_CONTAIN: {
                        return `"${String(item.field)}" not ilike ${this.getRawValue(`%${String(item.values?.[0])}%`)}`;
                    }
                    case OperatorType.EQUAL: {
                        return `"${String(item.field)}" = ${this.getRawValue(item.values?.[0])}`;
                    }
                    case OperatorType.NOT_EQUAL: {
                        return `"${String(item.field)}" is distinct from ${this.getRawValue(item.values?.[0])}`;
                    }
                    case OperatorType.LESS_EQUAL: {
                        return `"${String(item.field)}" <= ${this.getRawValue(item.values?.[0])}`;
                    }
                    case OperatorType.LESS_THAN: {
                        return `"${String(item.field)}" < ${this.getRawValue(item.values?.[0])}`;
                    }
                    case OperatorType.GREAT_EQUAL: {
                        return `"${String(item.field)}" >= ${this.getRawValue(item.values?.[0])}`;
                    }
                    case OperatorType.GREAT_THAN: {
                        return `"${String(item.field)}" > ${this.getRawValue(item.values?.[0])}`;
                    }
                    case OperatorType.INCLUDE: {
                        return `"${String(item.field)}" in ${this.getRawValue(item.values)}`;
                    }
                    case OperatorType.NOT_INCLUDE: {
                        return `"${String(item.field)}" not in ${this.getRawValue(item.values)}`;
                    }
                    case OperatorType.NULL: {
                        return `"${String(item.field)}" is null`;
                    }
                    case OperatorType.NOT_NULL: {
                        return `"${String(item.field)}" is not null`;
                    }
                    default: {
                        return null;
                    }
                }
            })
            .filter(Boolean);
    }

    getExportQuery<E extends BaseEntity>(
        entity: Type<E>,
        condition: any,
        query: CommonQueryDto<E>,
        exportQuery: ExportQueryDto & BaseCommandOption<Transaction>,
    ): FindOptions<E> {
        let finalQuery: FindOptions = {};
        if (exportQuery.ids) {
            finalQuery = { where: { _id: { [Op.in]: exportQuery.ids } } };
        } else {
            finalQuery = { where: this.getCondition(condition, query.filters) };
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
                    tree[key] = {
                        field,
                        fields,
                        object: systemDef.object,
                        hasMany: def.hasMany,
                    };
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

        const dfs = (node: ExportTreeNode): IncludeOptions => {
            const attributes: string[] = [];
            const include: IncludeOptions[] = [];
            node.children.forEach((child) => {
                const childNode = tree[child];
                if (childNode) {
                    if (!childNode.object) {
                        if (childNode.children) {
                            const includeChild: IncludeOptions = {
                                association: childNode.field,
                                separate: childNode.hasMany,
                                ...dfs(childNode),
                            };
                            include.push(includeChild);
                        } else {
                            attributes.push(childNode.field);
                        }
                    } else {
                        attributes.push(childNode.field);
                    }
                }
            });
            const res: IncludeOptions = {};
            if (include.length > 0) {
                res.include = include;
            }
            if (
                attributes.length > 0 &&
                include.every((item) => !item.separate)
            ) {
                res.attributes = attributes;
            }
            return res;
        };

        const includeNodes = dfs(treeRoot);
        includeNodes.include = includeNodes.include || [];
        includeNodes.include.push(
            ...SqlUtil.getIncludeable<E>(query?.population || []),
        );
        Object.assign(finalQuery, includeNodes);
        if (
            includeNodes.include.some((item: IncludeOptions) => item.separate)
        ) {
            finalQuery.attributes = null;
        }
        finalQuery.transaction = exportQuery?.transaction;
        return finalQuery;
    }
}

const SqlUtil: SqlUtilLoader =
    global.SqlUtil || (global.SqlUtil = new SqlUtilLoader());

export { SqlUtil };
