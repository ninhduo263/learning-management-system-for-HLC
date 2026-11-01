import { IsString } from "class-validator";

export class DeleteManyByIdsDto {
    @IsString({ each: true })
    ids: string[];
}
