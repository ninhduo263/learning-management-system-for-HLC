import { StrObjectId } from "@common/constant";
import { FileScope, FileStorageType } from "@module/file/common/constant";
import { File } from "@module/file/entities/file.entity";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";

@Table({ tableName: Entity.FILE })
export class FileModel extends Model implements File {
    @StrObjectId()
    _id: string;

    @Column({ allowNull: false })
    name: string;

    @Column({ allowNull: false })
    author: string;

    @Column({ allowNull: false })
    authorName: string;

    @Column({ allowNull: false })
    mimetype: string;

    @Column({ allowNull: false })
    size: number;

    @Column({
        type: DataType.ENUM(...Object.values(FileScope)),
        defaultValue: FileScope.PUBLIC,
    })
    scope: FileScope;

    @Column({ type: DataType.ENUM(...Object.values(FileStorageType)) })
    storageType: FileStorageType;

    @Column({ allowNull: false, type: DataType.TEXT })
    data: string;

    // toJSON() {
    //     const res = super.toJSON();
    //     delete res.data;
    //     return res;
    // }
}
