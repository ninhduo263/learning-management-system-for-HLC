import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";
import { LibraryType } from "../common/constant";
import { LibraryItem } from "../entities/library-item.entity";

@Table({ tableName: Entity.LIBRARY_ITEM })
export class LibraryItemModel extends Model implements LibraryItem {
    @StrObjectId()
    _id: string;

    @Column({
        type: DataType.STRING,
        validate: { isIn: [Object.values(LibraryType)] },
        allowNull: false,
    })
    libraryType: LibraryType;

    @Column({ type: DataType.STRING(24), allowNull: true })
    departmentId?: string;

    @Column({ type: DataType.STRING(500), allowNull: false })
    title: string;

    @Column({ type: DataType.STRING(255), allowNull: true })
    author?: string;

    @Column({ type: DataType.STRING(100), allowNull: true })
    category?: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    description?: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    coverUrl?: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    fileUrl?: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    externalUrl?: string;

    @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
    isActive?: boolean;

    @Column({ type: DataType.STRING(24), allowNull: true })
    createdBy?: string;
}
