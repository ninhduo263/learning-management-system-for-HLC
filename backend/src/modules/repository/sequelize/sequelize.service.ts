import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import pLimit from "p-limit";
import { Sequelize } from "sequelize-typescript";

@Injectable()
export class SequelizeService implements OnModuleInit {
    constructor(private sequelize: Sequelize) {}

    async onModuleInit() {
        await this.removeDuplicatedConstraints("f");
        await this.removeDuplicatedConstraints("u");
    }

    private async removeDuplicatedConstraints(contype: "f" | "u") {
        const tableNames = Object.values(this.sequelize.models).map((model) => {
            return model.tableName;
        });
        Logger.verbose(
            "Removing duplicated foreign keys",
            SequelizeService.name,
        );
        const limit = pLimit(16);
        const query = this.sequelize.getQueryInterface();
        const deleteConstraintList: Array<{ tableName: string; name: string }> =
            await Promise.all(
                tableNames.map((tableName) =>
                    limit(async () => {
                        const constraintList: any[] =
                            await this.sequelize.query(
                                `
                        select
                            oid,
                            conname,
                            conrelid::regclass AS table_name,
                            a.attname AS column_name,
                            contype
                        from
                            pg_constraint c
                        join
                            pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
                        where
                            contype = '${contype}' and conrelid::regclass = '"${tableName}"'::regclass
                        order by column_name asc, oid desc;
                        `,
                                { type: "select" },
                            );
                        const oldConstraintList: Array<{
                            tableName: string;
                            name: string;
                        }> = [];
                        for (let i = 0; i < constraintList.length; i++) {
                            if (
                                i > 0 &&
                                constraintList[i].column_name ===
                                    constraintList[i - 1].column_name
                            ) {
                                oldConstraintList.push({
                                    tableName,
                                    name: constraintList[i].conname,
                                });
                            }
                        }
                        return oldConstraintList;
                    }),
                ),
            ).then((list) =>
                list.reduce((previous, item) => previous.concat(item), []),
            );
        if (deleteConstraintList.length > 0) {
            for (const item of deleteConstraintList) {
                await query
                    .removeConstraint(item.tableName, item.name)
                    .catch((err) => {
                        Logger.warn(
                            `Error removing duplicated contype "${contype}" table "${item.tableName}" - constraint "${item.name}: ${err}"`,
                            SequelizeService.name,
                        );
                    })
                    .then(() => {
                        Logger.verbose(
                            `Removing duplicated contype "${contype}" table "${item.tableName}" - constraint "${item.name}"`,
                            SequelizeService.name,
                        );
                    });
            }
            Logger.verbose(
                `Removed duplicated contype "${contype}": ${deleteConstraintList.length} constraint(s)`,
                SequelizeService.name,
            );
        } else {
            Logger.verbose(
                `No duplicated contype "${contype}"`,
                SequelizeService.name,
            );
        }
    }
}
