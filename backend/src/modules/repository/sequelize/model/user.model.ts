import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Gender, SystemRole } from "@module/user/common/constant";
import { User } from "@module/user/entities/user.entity";
import { Column, DataType, Model, Table } from "sequelize-typescript";

@Table({
    tableName: Entity.USER,
    indexes: [{ fields: ["dataPartitionCode"] }],
})
export class UserModel extends Model implements User {
    @StrObjectId()
    _id: string;

    @Column({ allowNull: false, unique: true })
    username: string;

    @Column({ allowNull: true })
    password?: string;

    @Column({ allowNull: false, validate: { isEmail: true } })
    email: string;

    @Column({})
    firstname?: string;

    @Column({})
    lastname?: string;

    @Column({ type: DataType.STRING })
    fullname?: string;

    @Column({
        type: DataType.ENUM(...Object.values(Gender)),
    })
    gender?: Gender;

    @Column({})
    dob?: string;

    @Column
    ssoId?: string;

    @Column({
        type: DataType.ENUM(...Object.values(SystemRole)),
        allowNull: false,
    })
    systemRole: SystemRole;

    @Column({})
    dataPartitionCode?: string;
}
