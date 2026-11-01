import { StrObjectId } from "@common/constant";
import { Increment } from "@module/increment/entities/increment.entity";
import { Entity } from "@module/repository";
import { Column, Model, Table } from "sequelize-typescript";

@Table({
    tableName: Entity.INCREMENT,
})
export class IncrementModel extends Model<Increment> implements Increment {
    @StrObjectId()
    _id: string;

    @Column({})
    name: string;

    @Column
    count: number;
}
