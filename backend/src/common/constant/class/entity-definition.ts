import { EntityDefinitionDto } from "@common/dto/entity-definition/entity-definition.dto";
import { ExportDefinitionDto } from "@common/dto/entity-definition/export-definition.dto";
import { ImportDefinitionDto } from "@common/dto/entity-definition/import-definition.dto";
import { Type } from "@nestjs/common";

const ENTITY_DEFINITION_KEY = "entity:definition";

type EntityDefinitionFieldProps = Omit<
    EntityDefinitionDto,
    "field" | "type" | "children"
>;

class EntityDefinitionLoader {
    addDefinition = (target: any, definition: EntityDefinitionDto) => {
        const importList: EntityDefinitionDto[] =
            Reflect.getMetadata(ENTITY_DEFINITION_KEY, target.constructor) ||
            [];
        importList.push(definition);
        Reflect.defineMetadata(
            ENTITY_DEFINITION_KEY,
            importList,
            target.constructor,
        );
    };

    field(props: EntityDefinitionFieldProps) {
        return (target: any, propertyKey: string) => {
            const propertyTarget =
                props?.propertyTarget ||
                Reflect.getMetadata("design:type", target, propertyKey);
            const definition: EntityDefinitionDto = {
                field: propertyKey,
                propertyTarget,
                type: propertyTarget?.name,
                ...props,
            };
            if (definition.type === "Boolean") {
                definition.enum = definition.enum || [0, 1];
            }
            this.addDefinition(target, definition);
        };
    }

    getImportDefinition(entity: Type): ImportDefinitionDto[] {
        const res: EntityDefinitionDto[] =
            Reflect.getMetadata(ENTITY_DEFINITION_KEY, entity) || [];
        return res
            .filter((definition) => definition.disableImport !== true)
            .map((item, index) => ({ item, index }))
            .sort(
                (a, b) =>
                    (a.item.order || 0) - (b.item.order || 0) ||
                    a.index ||
                    b.index,
            )
            .map((item) => item.item)
            .map((definition) => {
                const { disableImport, propertyTarget, ...importDefinition } =
                    definition;
                return importDefinition;
            });
    }

    getExportDefinition(
        entity: Type,
        parentData: Pick<
            ExportDefinitionDto,
            "fields" | "labels" | "object"
        > = {
            fields: [],
            labels: [],
        },
    ): ExportDefinitionDto[] {
        if (!entity) {
            return [];
        }
        const definitions: EntityDefinitionDto[] =
            Reflect.getMetadata(ENTITY_DEFINITION_KEY, entity) || [];
        const res = definitions.map((definition) => {
            const {
                field,
                label,
                required,
                propertyTarget,
                type,
                disableImport,
                object,
                hasMany,
                hidden,
            } = definition;
            const fields = parentData.fields.concat(field);
            const labels = parentData.labels.concat(label);
            const children: ExportDefinitionDto[] = this.getExportDefinition(
                propertyTarget,
                { fields, labels, object },
            );
            const exportDefinition: ExportDefinitionDto = {
                // field,
                label,
                fields,
                labels,
                required,
                type,
                children,
                disableImport,
                hasMany,
                object,
                hidden,
            };
            return exportDefinition;
        });
        return res.length > 0 ? res : undefined;
    }
}

const EntityDefinition: EntityDefinitionLoader =
    global.EntityDefinition ||
    (global.EntityDefinition = new EntityDefinitionLoader());

export { EntityDefinition };
