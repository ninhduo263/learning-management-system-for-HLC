import { StrObjectId } from "@common/constant";
import { Entity } from "@module/repository";
import { Column, DataType, Model, Table } from "sequelize-typescript";
import { Gender, MemberStatus, MemberType } from "../common/constant";
import { Member } from "../entities/member.entity";

@Table({ tableName: Entity.MEMBER })
export class MemberModel extends Model implements Member {
    @StrObjectId()
    _id: string;

    @Column({ type: DataType.STRING(24), allowNull: true, unique: true })
    userId?: string;

    @Column({ type: DataType.STRING(20), allowNull: false, unique: true })
    memberCode: string;

    @Column({
        type: DataType.STRING,
        validate: { isIn: [Object.values(MemberType)] },
        allowNull: false,
    })
    memberType: MemberType;

    @Column({ type: DataType.STRING(255), allowNull: false })
    fullName: string;

    @Column({ type: DataType.DATEONLY, allowNull: true })
    dateOfBirth?: string;

    @Column({
        type: DataType.STRING,
        validate: { isIn: [Object.values(Gender)] },
        allowNull: true,
    })
    gender?: Gender;

    @Column({ type: DataType.STRING(20), allowNull: true })
    phone?: string;

    @Column({ type: DataType.STRING(255), allowNull: true })
    email?: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    profileUrl?: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    address?: string;

    @Column({ type: DataType.STRING(255), allowNull: true })
    hometown?: string;

    /** Ngành học (MTE: ngành đang học; MTO: ngành đã học) - tiêu chí gợi ý ghép cặp */
    @Column({ type: DataType.STRING(255), allowNull: true })
    major?: string;

    /** Ngành nghề / lĩnh vực công việc (MTE: định hướng; MTO: đang làm) */
    @Column({ type: DataType.STRING(255), allowNull: true })
    occupation?: string;

    /** Quê quán: mã tỉnh trong danh mục 34 tỉnh, thành phố (Province.code) */
    @Column({ type: DataType.STRING(30), allowNull: true })
    hometownCode?: string;

    /** Địa chỉ (nơi sống): mã tỉnh trong danh mục */
    @Column({ type: DataType.STRING(30), allowNull: true })
    addressCode?: string;

    @Column({ type: DataType.STRING(50), allowNull: true })
    bankAccount?: string;

    /** Số CCCD (dữ liệu nhạy cảm: chỉ Admin toàn cục và chính chủ xem; xem / sửa / xuất đều ghi nhật ký) */
    @Column({ type: DataType.STRING(20), allowNull: true, unique: true })
    nationalId?: string;

    @Column({ type: DataType.STRING(255), allowNull: true })
    bankName?: string;

    @Column({ type: DataType.STRING(100), allowNull: true })
    livingAllowanceType?: string;

    @Column({ type: DataType.DATEONLY, allowNull: true })
    joinedAt?: string;

    @Column({ type: DataType.DATEONLY, allowNull: true })
    allowanceStartDate?: string;

    @Column({
        type: DataType.STRING,
        validate: { isIn: [Object.values(MemberStatus)] },
        allowNull: false,
        defaultValue: MemberStatus.ACTIVE,
    })
    status?: MemberStatus;

    @Column({ type: DataType.TEXT, allowNull: true })
    note?: string;
}
