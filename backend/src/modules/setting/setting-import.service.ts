/* eslint-disable @typescript-eslint/no-unused-vars */

import { BaseImportService } from "@config/service/base-import.service";
import { Entity } from "@module/repository";
import { BaseTransaction } from "@module/repository/common/base-transaction.interface";
import { InjectRepository } from "@module/repository/common/repository";
import { InjectTransaction } from "@module/repository/common/transaction";
import { Injectable } from "@nestjs/common";
import { Setting } from "./entities/setting.entity";
import { SettingRepository } from "./repository/setting-repository.interface";

@Injectable()
export class SettingImportService extends BaseImportService<
    Setting,
    SettingRepository
> {
    constructor(
        @InjectRepository(Entity.SETTING)
        private readonly settingRepository: SettingRepository,
        @InjectTransaction()
        private readonly settingTransaction: BaseTransaction,
    ) {
        super(settingRepository, { transaction: settingTransaction });
    }

    async preprocessImport(
        rows: { index: number; row: any }[],
        transaction: unknown,
    ): Promise<{ rows: { index: number; row: any }[]; context?: any }> {
        return { rows };
    }

    async validateAndTransformRowData(
        rowData: { index: number; row: any },
        transaction: unknown,
        context?: any,
    ): Promise<{ doc: { index: number; row: Setting }; errors: string[] }> {
        return { doc: rowData, errors: [] };
    }

    async insertRowData(
        doc: { index: number; row: Setting },
        transaction: unknown,
        context?: any,
    ): Promise<Setting> {
        return this.settingRepository.create(doc.row, { transaction });
    }
}
