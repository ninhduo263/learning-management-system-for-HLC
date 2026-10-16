import { ObjectUtil } from "@common/utils/object.util";
import { Injectable } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import _ from "lodash";
import { Connection } from "mongoose";
import { QueryTypes } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import { ReplaceDomainUrlDto } from "./dto/replace-domain-url.dto";

@Injectable()
export class DataProcessService {
    constructor(
        private readonly sequelize: Sequelize,
        @InjectConnection() private readonly connection: Connection,
    ) {}

    private getUpdateObjectReplaceDomain(obj: any, dto: ReplaceDomainUrlDto) {
        let updateObject: Record<
            string,
            { value: string; type: "string" | "object" }
        >;
        Object.keys(obj).forEach((key) => {
            const value = obj[key];
            const type = typeof value;
            let newValue: string;
            switch (type) {
                case "string": {
                    newValue = value;
                    break;
                }
                case "object": {
                    newValue = JSON.stringify(value);
                    break;
                }
            }
            if (newValue && newValue.includes(dto.oldDomain)) {
                updateObject ??= {};
                newValue = newValue.replace(dto.oldDomain, dto.newDomain);
                updateObject[key] = { value: newValue, type: type as any };
            }
        });
        return updateObject;
    }

    async replaceDomainUrlMongo(dto: ReplaceDomainUrlDto) {
        const collectUpdateFields = (
            obj: any,
            fieldPath: string,
            update: any,
        ) => {
            const type = typeof obj;
            switch (type) {
                case "string": {
                    if (obj.includes(dto.oldDomain)) {
                        Object.assign(update, {
                            [fieldPath]: obj.replaceAll(
                                dto.oldDomain,
                                dto.newDomain,
                            ),
                        });
                    }
                    break;
                }
                case "object": {
                    _.forOwn(obj, (value, key) => {
                        const newPath = !fieldPath
                            ? key
                            : `${fieldPath}.${key}`;
                        collectUpdateFields(value, newPath, update);
                    });
                    break;
                }
            }
        };
        const skipDbSet = new Set(dto.skipTables || []);
        const collections = await this.connection.db.collections();
        for (const collection of collections) {
            const tableName = collection.collectionName;
            const bulk = collection.initializeOrderedBulkOp();
            if (!skipDbSet.has(tableName)) {
                let i = 0;
                const total = await collection.estimatedDocumentCount();
                for await (const item of collection.find()) {
                    i += 1;
                    const _id = item._id;
                    const update = {};
                    collectUpdateFields(item, null, update);
                    if (!ObjectUtil.isEmptyObject(update)) {
                        console.log(i, "/", total, tableName, _id, "UPDATE");
                        bulk.find({ _id: item._id }).updateOne({
                            $set: update,
                        });
                    } else {
                        console.log(i, "/", total, tableName, _id, "SKIP");
                    }
                }
            }
            if (bulk.length) {
                await bulk.execute();
            }
        }
    }

    async replaceDomainUrlSql(dto: ReplaceDomainUrlDto) {
        const skipDbSet = new Set(dto.skipTables || []);
        const tableNames = await this.sequelize
            .query(
                `
            SELECT table_name 
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
          `,
                { type: QueryTypes.SELECT },
            )
            .then((list) => list.map((item) => String(item["table_name"])));

        const processBatch = async (tableName: string, pageSize = 50000) => {
            console.log(tableName);
            const primaryKey = await this.sequelize
                .query(
                    `
                    SELECT a.attname
                    FROM   pg_index i
                    JOIN   pg_attribute a ON a.attrelid = i.indrelid
                                        AND a.attnum = ANY(i.indkey)
                    WHERE  i.indrelid = '"${tableName}"'::regclass
                    AND    i.indisprimary;
                `,
                    { type: QueryTypes.SELECT },
                )
                .then((res) => res[0]?.["attname"]);
            if (primaryKey === "_id") {
                try {
                    let currentPage = 1;
                    let hasMoreData = true;
                    const allData = [];

                    while (hasMoreData) {
                        // Calculate OFFSET for the current page
                        const offset = (currentPage - 1) * pageSize;

                        // Fetch a single page of data
                        const data = await this.sequelize.query(
                            `SELECT * FROM "${tableName}" order by "${primaryKey}" ASC LIMIT :limit OFFSET :offset`,
                            {
                                replacements: { limit: pageSize, offset },
                                type: QueryTypes.SELECT,
                            },
                        );

                        let index = 0;
                        for (const obj of data) {
                            index += 1;
                            const update = this.getUpdateObjectReplaceDomain(
                                obj,
                                dto,
                            );
                            const _id = obj["_id"];
                            if (update) {
                                const updateParams = Object.keys(update)
                                    .map((key) => {
                                        const item = update[key];
                                        switch (item.type) {
                                            case "string": {
                                                return `"${key}" = :${key}`;
                                            }
                                            case "object": {
                                                return `"${key}" = :${key}`;
                                            }
                                        }
                                    })
                                    .join();
                                const updateValue = Object.keys(update).reduce(
                                    (map, key) => {
                                        const item = update[key];

                                        switch (item.type) {
                                            case "string": {
                                                map[key] = item.value;
                                                break;
                                            }
                                            case "object": {
                                                map[key] = item.value;
                                                break;
                                            }
                                        }
                                        return map;
                                    },
                                    {},
                                );
                                const updateQuery = `update "${tableName}" set ${updateParams} where _id = '${_id}'`;
                                await this.sequelize.query(updateQuery, {
                                    type: QueryTypes.UPDATE,
                                    replacements: updateValue,
                                });
                                console.log(
                                    index,
                                    "/",
                                    data.length,
                                    tableName,
                                    _id,
                                    "UPDATED",
                                );
                            } else {
                                console.log(
                                    index,
                                    "/",
                                    data.length,
                                    tableName,
                                    _id,
                                    "SKIP",
                                );
                            }
                        }

                        // Check if more data is available
                        hasMoreData = data.length === pageSize;
                        currentPage++;
                    }

                    console.log(`All data fetched: ${allData.length} records`);
                    return allData;
                } catch (error) {
                    console.error("Error fetching data:", error);
                    throw error;
                }
            }
        };
        for (const tableName of tableNames) {
            if (!skipDbSet.has(tableName)) {
                await processBatch(tableName);
            }
        }
    }
}
