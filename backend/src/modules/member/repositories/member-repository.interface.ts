import { BaseRepository } from "@module/repository/common/base-repository.interface";
import { Member } from "../entities/member.entity";

export interface MemberRepository extends BaseRepository<Member> {}
