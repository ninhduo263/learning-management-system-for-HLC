import { BaseRepository } from "@module/repository/common/base-repository.interface";
import { PointAdjustment } from "../entities/point-adjustment.entity";

export interface PointAdjustmentRepository
    extends BaseRepository<PointAdjustment> {}
