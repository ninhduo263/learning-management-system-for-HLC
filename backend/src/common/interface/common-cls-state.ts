import { DataPartition } from "@module/data-partition/entities/data-partition.entity";
import { ClsStore } from "nestjs-cls";

export interface CommonClsState extends ClsStore {
    dataPartition?: DataPartition;
}
