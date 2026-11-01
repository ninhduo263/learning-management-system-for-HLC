import { StrObjectId } from "@common/constant";
import { ClientPlatform } from "@module/auth/common/constant";
import { Auth } from "@module/auth/entities/auth.entity";
import { Entity } from "@module/repository";
import { User } from "@module/user/entities/user.entity";
import {
    BelongsTo,
    Column,
    DataType,
    ForeignKey,
    Model,
    Table,
} from "sequelize-typescript";
import { UserModel } from "./user.model";

@Table({ tableName: Entity.AUTH })
export class AuthModel extends Model implements Auth {
    @StrObjectId()
    _id: string;

    @Column
    ip: string;

    @Column({ type: DataType.ENUM(...Object.values(ClientPlatform)) })
    platform: ClientPlatform;

    @Column({ type: DataType.JSON })
    userAgent: Record<string, unknown>;

    @Column
    origin: string;

    @Column
    @ForeignKey(() => UserModel)
    user: string;

    @BelongsTo(() => UserModel)
    userInfo: User;

    @Column
    jti?: string;

    @Column
    exp?: number;

    @Column({ defaultValue: 0 })
    test: number;
}
