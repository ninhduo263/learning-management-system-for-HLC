import { Matches } from "class-validator";
import { MENTOR_CODE, MENTEE_CODE } from "./member-code";

export class UpdateSessionPairDto {
    @Matches(MENTOR_CODE)
    mentorCode: string;

    @Matches(MENTEE_CODE)
    menteeCode: string;
}
