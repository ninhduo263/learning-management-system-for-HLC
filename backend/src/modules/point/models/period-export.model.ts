import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";
import { PeriodExportType } from "../common/constant";
import { PeriodExport } from "../entities/period-export.entity";

@Table({ tableName: Entity.PERIOD_EXPORT })
export class PeriodExportModel extends Model implements PeriodExport {
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    periodId: string;

    @Column({
        type: DataType.STRING,
        validate: { isIn: [Object.values(PeriodExportType)] },
        allowNull: false,
    })
    exportType: PeriodExportType;

    @Column({ type: DataType.TEXT, allowNull: false })
    fileUrl: string;

    @Column({ type: DataType.STRING(64), allowNull: true })
    checksum?: string;

    @Column({ type: DataType.STRING(24), allowNull: true })
    exportedBy?: string;

    @Column({
        type: DataType.DATE,
        allowNull: false,
        defaultValue: DataType.NOW,
    })
    exportedAt?: Date;

    @Column({ type: DataType.TEXT, allowNull: true })
    note?: string;
}
