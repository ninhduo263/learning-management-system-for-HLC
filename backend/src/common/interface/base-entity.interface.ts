export interface BaseEntity {
    _id: string;
    ma?: any;
    externalId?: string;
    tenantId?: string;
    createdAt?: Date;
    updatedAt?: Date;
    dataPartitionCode?: string;
}
