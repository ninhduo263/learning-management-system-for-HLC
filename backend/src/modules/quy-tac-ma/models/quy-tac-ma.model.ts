import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";
import { CauHinhMa } from "../entities/cau-hinh-ma.entity";
import { QuyTacMa } from "../entities/quy-tac-ma.entity";

@Table({ tableName: Entity.QUY_TAC_MA })
export class QuyTacMaModel extends Model implements QuyTacMa {
    @StrObjectId()
    _id: string;

    @Column({ unique: true })
    ten: string;

    @Column({ unique: true })
    nguon: string;

    @Column({ type: DataType.JSONB })
    cauHinh: CauHinhMa[];
}
