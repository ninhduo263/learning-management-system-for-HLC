import { BaseRepository } from "@module/repository/common/base-repository.interface";
import { MemberPosition } from "../entities/member-position.entity";

export interface MemberPositionRepository
    extends BaseRepository<MemberPosition> {}
