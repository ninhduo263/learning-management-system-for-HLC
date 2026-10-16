import { StrObjectId } from "@common/constant";
import { OneSignalUser } from "@module/one-signal/entities/one-signal-user.entity";
import { Entity } from "@module/repository";
import { Column, Model, Table } from "sequelize-typescript";

@Table({ tableName: Entity.ONE_SIGNAL_USER })
export class OneSignalUserModel extends Model implements OneSignalUser {
    @StrObjectId()
    _id: string;

    @Column({ allowNull: false })
    playerId: string;

    @Column({ allowNull: false })
    auth: string;

    @Column({ allowNull: false })
    user: string;

    @Column({ allowNull: false })
    inactiveAt?: Date;

    @Column({ allowNull: false })
    expireAt?: Date;
}
