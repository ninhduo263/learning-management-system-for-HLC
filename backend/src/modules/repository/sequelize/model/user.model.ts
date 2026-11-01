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

    /** Lần tự đổi mật khẩu gần nhất (null = chưa đổi từ khi được cấp) */
    @Column({ type: DataType.DATE, allowNull: true })
    passwordChangedAt?: Date;

    /** Admin toàn cục vừa ghi đè mật khẩu: bắt buộc tự đổi lại ở lần đăng nhập kế tiếp (vòng 10) */
    @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
    mustChangePassword?: boolean;

    /** Lần ghi đè mật khẩu gần nhất: mọi phiên đăng nhập cấp trước thời điểm này bị đăng xuất */
    @Column({ type: DataType.DATE, allowNull: true })
    passwordResetAt?: Date;
}
