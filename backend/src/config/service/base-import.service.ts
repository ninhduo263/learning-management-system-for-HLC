/* eslint-disable @typescript-eslint/no-unused-vars */
import { exportFileHelper, ExportType } from "@common/constant";
import { EntityDefinition } from "@common/constant/class/entity-definition";
import { CommonQueryDto } from "@common/dto/common-query.dto";
import { ImportDefinitionDto } from "@common/dto/entity-definition/import-definition.dto";
import { ImportResultDto } from "@common/dto/entity-definition/import-result.dto";
import { ImportValidateRowDto } from "@common/dto/entity-definition/import-validate-row.dto";
import { ExportQueryDto } from "@common/dto/export-query.dto";
import { BaseEntity } from "@common/interface/base-entity.interface";
import { BaseImportDto, ImportMode } from "@common/interface/base-import.dto";
import { ApiError } from "@config/exception/api-error";
import {
    BaseRepository,
    QueryCondition,
} from "@module/repository/common/base-repository.interface";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { SettingKey } from "@module/setting/common/constant";
import { SettingService } from "@module/setting/setting.service";
import { User } from "@module/user/entities/user.entity";
import { forwardRef, Inject, Logger, Type } from "@nestjs/common";
import { plainToClass } from "class-transformer";
import { validateSync } from "class-validator";
import exceljs from "exceljs";
import { NextFunction, Response } from "express";
import _ from "lodash";
import moment from "moment";
import pLimit from "p-limit";
import xlsx from "xlsx";

export type ExportTransformedData = {
    fields: string[];
    value: unknown;
};

export type ImportContext = { query?: unknown; params?: unknown } & {
    [field: string]: unknown;
};

export class BaseImportService<
    E extends BaseEntity,
    R extends BaseRepository<E>,
> {
    @Inject(forwardRef(() => SettingService))
    private readonly biSettingService: SettingService;

    constructor(
        private readonly repository: R,
        private readonly property: {
            settingService?: SettingService;
            transaction: BaseTransaction;
            useTransactionInsert?: boolean;
            useSavepoint?: boolean;
            concurentInsert?: number;
        },
    ) {}

    async getImportDefinition(user: User, entity: Type<E>) {
        return EntityDefinition.getImportDefinition(entity);
    }

    private async getImportTemplateData(entity: Type<E>) {
        const definition = EntityDefinition.getImportDefinition(entity);
        const example = definition.map((d) => d.example ?? null);
        return example;
    }

    async getImportTemplate(
        user: User,
        entity: Type<E>,
        res: Response,
        next: NextFunction,
        options?: {
            definition?: ImportDefinitionDto[];
            exampleData?: unknown[];
        },
    ) {
        options = options || {};
        try {
            let { exampleData, definition } = options;
            exampleData =
                exampleData || (await this.getImportTemplateData(entity));
            definition = (
                definition || (await this.getImportDefinition(user, entity))
            )
                .map((item, index) => ({ item, index }))
                .sort(
                    (a, b) =>
                        (a.item.order || 0) - (b.item.order || 0) ||
                        a.index ||
                        b.index,
                )
                .map((item) => item.item);
            const header = definition.map((d) => d.label);
            const wb = new exceljs.Workbook();
            const dataSheet = wb.addWorksheet("Data", {
                properties: {
                    defaultColWidth: 20,
                },
            });
            const enumSheet = wb.addWorksheet("Enum", {
                state: "hidden",
            });
            const headerRow = dataSheet.addRow(header);
            definition.forEach((item, index) => {
                if (item.hidden) {
                    dataSheet.getColumn(index + 1).hidden = true;
                }
            });
            dataSheet.addRows(exampleData);

            // Validation
            headerRow.eachCell((cell, index) => {
                cell.font = { bold: true };
                if (definition[index - 1].required) {
                    cell.font.color = { argb: "FF0000" };
                }
            });

            let totalEnum = 0;
            for (let col = 1; col <= header.length; col++) {
                if (definition[col - 1].enum) {
                    totalEnum += 1;
                    const colEnum = definition[col - 1].enum;
                    let startAddr: string;
                    let endAddr: string;
                    for (let i = 1; i <= colEnum.length; i++) {
                        const enumCeil = enumSheet.getCell(i, totalEnum);
                        enumCeil.value = colEnum[i - 1];
                        if (i === 1) {
                            startAddr = enumCeil.$col$row;
                        } else if (i === colEnum.length) {
                            endAddr = enumCeil.$col$row;
                        }
                    }
                    const formulae = [`Enum!${startAddr}:${endAddr}`];
                    for (let row = 2; row <= 10000; row++) {
                        const cell = dataSheet.getCell(row, col);
                        cell.dataValidation = {
                            type: "list",
                            allowBlank: true,
                            formulae,
                        };
                    }
                }
            }

            const buffer = await wb.xlsx.writeBuffer();
            exportFileHelper(
                buffer as Buffer,
                "import-template",
                ExportType.XLSX,
                res,
            );
        } catch (err) {
            next(err);
        }
    }

    /**
     * @override
     * @param rows Rows
     * @param transaction Transaction
     * @returns Rows, Context (Context dùng trong import)
     */
    async preprocessImport(
        rows: Array<{ index: number; row: any }>,
        transaction: unknown,
        context?: ImportContext,
    ): Promise<{
        rows: Array<{ index: number; row: any }>;
        context?: ImportContext;
    }> {
        return { rows, context };
    }

    /**
     * Logic xác thực dữ liệu
     * @override
     * @param rowData Rows
     * @param transaction Transaction
     * @param context Context lấy từ hàm preprocessImport(), có thể bổ sung trong quá trình xử lý
     * @returns Error strings
     */
    async validateAndTransformRowData(
        rowData: { index: number; row: any },
        transaction: unknown,
        context?: ImportContext,
    ): Promise<{ doc: { index: number; row: any }; errors: string[] }> {
        return { doc: rowData, errors: [] };
    }

    /**
     * @override
     * Logic insert data vào CSDL
     * @param doc Bản ghi chứa data insert
     * @param context ValidateContext
     * @returns
     */
    async insertRowData(
        rowData: { index: number; row: any },
        transaction: unknown,
        context?: ImportContext,
        user?: User,
        options?: {
            mode?: ImportMode;
            keys?: string[];
        },
    ): Promise<E> {
        const mode = options?.mode || ImportMode.CREATE;
        switch (mode) {
            case ImportMode.CREATE: {
                const res = await this.repository.create(rowData.row, {
                    transaction,
                });
                return res;
            }
            case ImportMode.UPDATE:
            case ImportMode.UPSERT: {
                const keys = options?.keys || [];
                const updateFilters = keys.reduce<QueryCondition<E>>(
                    (filters, key) =>
                        Object.assign(filters, { [key]: rowData.row[key] }),
                    {},
                );
                const res = await this.repository.updateOne(
                    updateFilters,
                    rowData.row,
                    {
                        transaction,
                        upsert: mode === ImportMode.UPSERT,
                    },
                );
                return res;
            }
        }
    }

    private async defaultValidateRowType(
        rowData: { index: number; row: any },
        RowClass: Type,
    ): Promise<string[]> {
        const rowClass = plainToClass(RowClass, rowData.row);
        const errorData = validateSync(rowClass, { forbidUnknownValues: true });
        const defaultErrors = errorData.reduce(
            (list, e) => list.concat(Object.values(e.constraints)),
            [],
        );
        return defaultErrors;
    }

    async insertImport(
        user: User,
        dto: BaseImportDto,
        RowClass: Type<any>,
        options?: {
            dryRun: boolean;
            query: unknown;
            params: unknown;
        },
    ): Promise<ImportResultDto> {
        if (!this.property.transaction) {
            throw ApiError.BadRequest("error-import-transaction-empty");
        }
        let error = false;
        let validate: ImportResultDto["validate"];
        let transaction: unknown;

        let { useSavepoint, useTransactionInsert, concurentInsert } =
            this.property;
        useSavepoint = useSavepoint ?? false;
        useTransactionInsert = useTransactionInsert ?? true;
        concurentInsert = useTransactionInsert ? 1 : (concurentInsert ?? 1);

        if (options?.dryRun === true) {
            transaction = await this.property.transaction.startTransaction();
        }
        try {
            const { query, params } = options || {};
            const limit = pLimit(options?.dryRun ? 1 : concurentInsert);
            const rowDataList = dto.rows.map((row, index) => ({ row, index }));
            const { rows, context } = await this.preprocessImport(
                rowDataList,
                transaction,
                { query, params, dryRun: options?.dryRun, user },
            );
            validate = await Promise.all(
                rows.map((rowData, index) =>
                    limit(async () => {
                        Logger.debug(
                            `Importing row ${index + 1} / ${rows.length}`,
                        );
                        const [defaultErrors, { doc, errors }] =
                            await Promise.all([
                                this.defaultValidateRowType(rowData, RowClass),
                                this.validateAndTransformRowData(
                                    rowData,
                                    transaction,
                                    context,
                                ),
                            ]);
                        const rowErrors = [...defaultErrors, ...errors];
                        let insertResult: unknown;
                        if (rowErrors.length === 0) {
                            let savepoint: unknown;
                            if (options?.dryRun === true) {
                                if (useSavepoint) {
                                    savepoint =
                                        await this.property.transaction.startTransaction(
                                            {
                                                transaction,
                                            },
                                        );
                                }
                            } else {
                                if (useTransactionInsert) {
                                    transaction =
                                        await this.property.transaction.startTransaction();
                                }
                            }
                            try {
                                const keys = await this.getImportDefinition(
                                    user,
                                    RowClass,
                                ).then((list) =>
                                    list
                                        .filter((item) => item.key)
                                        .map((item) => item.field),
                                );
                                Logger.debug(`${index + 1} / ${rows.length}`);
                                insertResult = await this.insertRowData(
                                    doc,
                                    transaction,
                                    context,
                                    user,
                                    {
                                        mode: dto.mode,
                                        keys,
                                    },
                                );
                                if (!options?.dryRun) {
                                    if (useTransactionInsert) {
                                        await this.property.transaction.commitTransaction(
                                            transaction,
                                        );
                                    }
                                }
                            } catch (err) {
                                if (options?.dryRun === true) {
                                    if (useSavepoint) {
                                        await this.property.transaction.abortTransaction(
                                            savepoint,
                                        );
                                    } else {
                                        await this.property.transaction.abortTransaction(
                                            transaction,
                                        );
                                        transaction =
                                            await this.property.transaction.startTransaction();
                                    }
                                } else {
                                    if (useTransactionInsert) {
                                        await this.property.transaction.abortTransaction(
                                            transaction,
                                        );
                                    }
                                }
                                console.error(err);
                                const dataErrors =
                                    this.repository.getRepositoryErrors(err);
                                rowErrors.push(...dataErrors);
                            }
                        }
                        error = error || rowErrors.length > 0;
                        return {
                            row: rowData.row,
                            index: rowData.index,
                            rowErrors,
                            insertResult,
                        };
                    }),
                ),
            );
            if (!options?.dryRun) {
                transaction =
                    await this.property.transaction.startTransaction();
            }
            await this.afterInsertImport(user, validate, { transaction });
            if (options?.dryRun === true) {
                await this.property.transaction.abortTransaction(transaction);
            } else {
                await this.property.transaction.commitTransaction(transaction);
            }
            Logger.debug(
                `Import finished (${options.dryRun ? "Validate" : "Insert"})`,
                RowClass.name,
            );
            return {
                error,
                validate,
            };
        } catch (err) {
            console.error("Error validate", err);
            if (options?.dryRun === true) {
                await this.property.transaction
                    .abortTransaction(transaction)
                    .catch((errTransaction) => {
                        console.error(
                            "Error aborting transaction validate",
                            errTransaction,
                        );
                    });
            }
            throw err;
        }
    }

    async afterInsertImport(
        user: User,
        validate: ImportValidateRowDto[],
        options: { transaction: unknown },
    ) {}

    getExportDefinition(user: User, entity: Type<E>) {
        return EntityDefinition.getExportDefinition(entity);
    }

    async getDateOnlyFormat() {
        let format = "YYYY-MM-DD";
        const settingService =
            this.biSettingService || this.property.settingService;
        if (settingService) {
            const setting = await settingService.getSettingValue(
                SettingKey.SERVER,
            );
            format = setting?.dateOnlyExportFormat || format;
        }
        return format;
    }

    private getDateOnlyValue(value: string, format: string) {
        const momentValue = moment(value, "YYYY-MM-DD");
        if (/^\d{4}-\d{2}-\d{2}$/.test(value) && momentValue.isValid()) {
            return momentValue.format(format);
        }
        return value;
    }

    async getExport(
        user: User,
        entity: Type<E>,
        conditions: QueryCondition<E>,
        query: CommonQueryDto<E>,
        exportQuery: ExportQueryDto,
        res: Response,
        next: NextFunction,
    ) {
        try {
            const now = moment().format("YYYY-MM-DD_HH-mm-ss");
            const dateOnlyFormat = await this.getDateOnlyFormat();
            const data = await this.repository.getExport(
                entity,
                conditions,
                query,
                exportQuery,
            );

            const setKeys = exportQuery.definitions.reduce<Set<string>>(
                (set, def) => {
                    for (let i = 1; i <= def.fields.length; i++) {
                        const key = def.fields.slice(0, i).join("/");
                        set.add(key);
                    }
                    return set;
                },
                new Set<string>(),
            );
            type DataType = "full" | "partial";
            const getData = (
                rowList: Record<string, unknown>[],
                type: DataType,
            ) => {
                const getNewRow = (row: unknown, dataType: DataType) => {
                    const newRow =
                        dataType === "partial" ? {} : _.cloneDeep<any>(row);
                    rowList.push(newRow);
                    return newRow;
                };
                const dfs = (
                    object: object,
                    row: Record<string, unknown>,
                    fields: string[],
                ) => {
                    for (const key in object) {
                        const currentFields = fields.concat(key);
                        const currentKey = currentFields.join("/");
                        if (!setKeys.has(currentKey)) {
                            continue;
                        }
                        let value = object[key];
                        const valueType = typeof value;
                        if (
                            valueType === "bigint" ||
                            valueType === "boolean" ||
                            valueType === "number" ||
                            valueType === "string" ||
                            valueType === "symbol" ||
                            valueType === "undefined"
                        ) {
                            if (typeof value === "string") {
                                value = value.slice(0, 32767);
                                value = this.getDateOnlyValue(
                                    value,
                                    dateOnlyFormat,
                                );
                            }
                            row[currentKey] = value;
                        } else if (value instanceof Date) {
                            row[currentKey] = moment(value).format(
                                "YYYY/MM/DD HH:mm:ss",
                            );
                        } else {
                            if (!Array.isArray(value)) {
                                dfs(value, row, currentFields);
                            } else {
                                value.forEach((item, index) => {
                                    const currentRow =
                                        index > 0 ? getNewRow(row, type) : row;
                                    const itemType = typeof item;
                                    if (typeof item === "string") {
                                        item = item.slice(0, 32767);
                                        item = this.getDateOnlyValue(
                                            item,
                                            dateOnlyFormat,
                                        );
                                    }
                                    if (
                                        itemType === "bigint" ||
                                        itemType === "boolean" ||
                                        itemType === "number" ||
                                        itemType === "string" ||
                                        itemType === "symbol" ||
                                        itemType === "undefined"
                                    ) {
                                        currentRow[currentKey] = item;
                                    } else if (item instanceof Date) {
                                        row[currentKey] = moment(item).format(
                                            "YYYY/MM/DD HH:mm:ss",
                                        );
                                    } else {
                                        dfs(item, currentRow, currentFields);
                                    }
                                });
                            }
                        }
                    }
                };
                data.forEach((item) => dfs(item, getNewRow({}, type), []));
            };

            const fullRowList: Record<string, unknown>[] = [];
            const partialRowList: Record<string, unknown>[] = [];

            getData(fullRowList, "full");
            const needPartial = fullRowList.length > data.length;
            if (needPartial) {
                getData(partialRowList, "partial");
            }
            const wb = xlsx.utils.book_new();
            const headers = exportQuery.definitions.reduce<string[]>(
                (list, def) => list.concat(def.labels.join("/")),
                [],
            );
            const getWorkSheet = (sheetName: string, rowList: any[]) => {
                const result = rowList.map((item) => {
                    const rowArray: unknown[] = [];
                    exportQuery.definitions.forEach((def) => {
                        const key = def.fields.join("/");
                        const value = item[key];
                        rowArray.push(
                            typeof value === "object"
                                ? JSON.stringify(value)
                                : value,
                        );
                    });
                    return rowArray;
                });

                wb.SheetNames.push(sheetName);
                const ws = xlsx.utils.aoa_to_sheet([headers, ...result]);
                wb.Sheets[wb.SheetNames[wb.SheetNames.length - 1]] = ws;
            };

            getWorkSheet("FULL_DATA", fullRowList);
            if (needPartial) {
                getWorkSheet("PARTIAL_DATA", partialRowList);
            }

            const buffer = xlsx.write(wb, {
                type: "buffer",
                compression: true,
            });
            exportFileHelper(
                buffer,
                `export-${entity.name}-${now}.xlsx`,
                ExportType.XLSX,
                res,
            );
        } catch (err) {
            next(err);
        }
    }
}
