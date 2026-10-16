import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Column, Model, Table } from "sequelize-typescript";
import { HamSinhMa } from "../entities/ham-sinh-ma.entity";

@Table({ tableName: Entity.HAM_SINH_MA })
export class HamSinhMaModel extends Model implements HamSinhMa {
    @StrObjectId()
    _id: string;

    @Column({ unique: true, allowNull: false })
    ten: string;

    @Column
    nguon: string;
}
