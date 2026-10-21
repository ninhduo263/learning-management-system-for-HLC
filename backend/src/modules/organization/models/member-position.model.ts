import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";
import { MemberPosition } from "../entities/member-position.entity";

@Table({ tableName: Entity.MEMBER_POSITION })
export class MemberPositionModel extends Model implements MemberPosition {
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    memberId: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    departmentId: string;

    @Column({ type: DataType.STRING(24), allowNull: false })
    positionId: string;

    @Column({ type: DataType.DATEONLY, allowNull: false })
    startDate: string;

    @Column({ type: DataType.DATEONLY, allowNull: true })
    endDate?: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    note?: string;
}
