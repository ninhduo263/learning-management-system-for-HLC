import { IsBoolean, IsOptional } from "class-validator";

export class EntityDefinitionDto {
    field: string;
    label: string;
    enum?: Array<string | number | boolean>;
    key?: boolean;
    propertyTarget?: any;
    type: any;
    required?: boolean;
    example?: string | number | boolean;
    disableImport?: boolean;
    disableExport?: boolean;
    object?: boolean;
    order?: number;

    @IsBoolean()
    @IsOptional()
    hasMany?: boolean;

    @IsBoolean()
    @IsOptional()
    hidden?: boolean;
}
