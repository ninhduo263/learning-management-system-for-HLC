import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Setting } from "@module/setting/entities/setting.entity";
import { Column, DataType, Model, Table } from "sequelize-typescript";

@Table({ tableName: Entity.SETTING })
export class SettingModel extends Model implements Setting {
    @StrObjectId()
    _id: string;

    @Column({ unique: true, allowNull: false })
    key: string;

    @Column({ type: DataType.JSON, allowNull: false })
    value: Record<string, any>;
}
