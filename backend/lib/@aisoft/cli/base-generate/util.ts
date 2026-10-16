import _ from "lodash";
import path from "path";
import { RepositoryType } from "./type";

export const getBaseInfo = (entity: string, repositoryType: RepositoryType) => {
    entity = _.kebabCase(path.basename(entity));
    const entityConstantName = _.snakeCase(entity).toUpperCase();

    /** Class name */
    const entityClassName = _.upperFirst(_.camelCase(entity));
    const moduleClassName = `${entityClassName}Module`;
    const modelClassName = `${entityClassName}Model`;
    const conditionDtoClassName = `${entityClassName}ConditionDto`;
    const createDtoClassName = `Create${entityClassName}Dto`;
    const updateDtoClassName = `Update${entityClassName}Dto`;
    const repositoryInterfaceName = `${entityClassName}Repository`;
    const repositorySqlClassName = `${entityClassName}SqlRepository`;
    const repositoryMongoClassName = `${entityClassName}MongoRepository`;
    const serviceClassName = `${entityClassName}Service`;
    const controllerClassName = `${entityClassName}Controller`;

    /** Directory */
    const moduleSrcDir = path.join(`src/modules/${entity}`);
    const commonSrcDir = path.join(moduleSrcDir, "common");
    const entitySrcDir = path.join(moduleSrcDir, "entities");
    const modelSrcDir = path.join(moduleSrcDir, "models");
    const dtoSrcDir = path.join(moduleSrcDir, "dto");
    const repositorySrcDir = path.join(moduleSrcDir, "repositories");
    const serviceSrcDir = path.join(moduleSrcDir, "services");
    const controllerSrcDir = path.join(moduleSrcDir, "controllers");

    /** File path*/
    const moduleFilePath = path.join(moduleSrcDir, `${entity}.module.ts`);
    const entityFilePath = path.join(entitySrcDir, `${entity}.entity.ts`);
    const modelFilePath = path.join(modelSrcDir, `${entity}.model.ts`);
    const conditionDtoFilePath = path.join(
        dtoSrcDir,
        `${entity}-condition.dto.ts`,
    );
    const createDtoFilePath = path.join(dtoSrcDir, `create-${entity}.dto.ts`);
    const updateDtoFilePath = path.join(dtoSrcDir, `update-${entity}.dto.ts`);
    const repositoryInterfaceFilePath = path.join(
        repositorySrcDir,
        `${entity}-repository.interface.ts`,
    );
    const sqlRepositoryFilePath = path.join(
        repositorySrcDir,
        `${entity}-sql.repository.ts`,
    );
    const mongoRepositoryFilePath = path.join(
        repositorySrcDir,
        `${entity}-mongo.repository.ts`,
    );
    const serviceFilePath = path.join(serviceSrcDir, `${entity}.service.ts`);
    const controllerFilePath = path.join(
        controllerSrcDir,
        `${entity}.controller.ts`,
    );

    /** Import path */
    const [
        moduleImportPath,
        entityImportPath,
        modelImportPath,
        conditionDtoImportPath,
        createDtoImportPath,
        updateDtoImportPath,
        repositoryInterfaceImportPath,
        sqlRepositoryImportPath,
        mongoRepositoryImportPath,
        serviceImportPath,
        controllerImportPath,
    ] = [
        moduleFilePath,
        entityFilePath,
        modelFilePath,
        conditionDtoFilePath,
        createDtoFilePath,
        updateDtoFilePath,
        repositoryInterfaceFilePath,
        sqlRepositoryFilePath,
        mongoRepositoryFilePath,
        serviceFilePath,
        controllerFilePath,
    ].map((filePath) => `@module/${filePath.slice(12, -3)}`);

    return {
        entity,
        entityConstantName,
        repositoryType,

        entityClassName,
        moduleClassName,
        modelClassName,
        conditionDtoClassName,
        createDtoClassName,
        updateDtoClassName,
        repositoryInterfaceName,
        repositorySqlClassName,
        repositoryMongoClassName,
        serviceClassName,
        controllerClassName,

        moduleSrcDir,
        commonSrcDir,
        entitySrcDir,
        modelSrcDir,
        dtoSrcDir,
        repositorySrcDir,
        serviceSrcDir,
        controllerSrcDir,

        moduleFilePath,
        entityFilePath,
        modelFilePath,
        conditionDtoFilePath,
        createDtoFilePath,
        updateDtoFilePath,
        repositoryInterfaceFilePath,
        sqlRepositoryFilePath,
        mongoRepositoryFilePath,
        serviceFilePath,
        controllerFilePath,

        moduleImportPath,
        entityImportPath,
        modelImportPath,
        conditionDtoImportPath,
        createDtoImportPath,
        updateDtoImportPath,
        repositoryInterfaceImportPath,
        sqlRepositoryImportPath,
        mongoRepositoryImportPath,
        serviceImportPath,
        controllerImportPath,
    };
};
