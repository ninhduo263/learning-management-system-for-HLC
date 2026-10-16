import { ImportValidateRowDto } from "./import-validate-row.dto";

export class ImportResultDto {
    error: boolean;
    validate: ImportValidateRowDto[];
}
