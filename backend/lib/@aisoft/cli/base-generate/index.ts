import _ from "lodash";
import {
    ArrayLiteralExpression,
    ObjectLiteralExpression,
    Project,
    PropertyAssignment,
    Scope,
    SyntaxKind,
    VariableDeclarationKind,
} from "ts-morph";
import { CliError } from "../util";
import { BaseInfo, RepositoryType } from "./type";
import { getBaseInfo } from "./util";

function generateModule(options: { baseInfo: BaseInfo; project: Project }) {
    const { baseInfo, project } = options;
    const {
        moduleSrcDir,
        commonSrcDir,
        entitySrcDir,
        modelSrcDir,
        dtoSrcDir,
        repositorySrcDir,
        serviceSrcDir,
        controllerSrcDir,
    } = baseInfo;
    [
        moduleSrcDir,
        commonSrcDir,
        entitySrcDir,
        modelSrcDir,
        dtoSrcDir,
        repositorySrcDir,
        serviceSrcDir,
        controllerSrcDir,
    ].forEach((dir) => {
        project.createDirectory(dir);
    });

    const moduleFile = project.createSourceFile(baseInfo.moduleFilePath, "", {
        overwrite: false,
    });
    moduleFile.addImportDeclaration({
        namedImports: ["Module"],
        moduleSpecifier: "@nestjs/common",
    });
    moduleFile.addClass({
        name: baseInfo.moduleClassName,
        isExported: true,
        decorators: [
            {
                name: "Module",
                arguments: [
                    `{
    imports: [],
    exports: [],
    providers: [],
    controllers: [],
}`,
                ],
            },
        ],
    });

    const appModuleFilePath = "src/app.module.ts";
    const appModuleFile = project.getSourceFile(appModuleFilePath);
    appModuleFile.addImportDeclaration({
        namedImports: [baseInfo.moduleClassName],
        moduleSpecifier: baseInfo.moduleImportPath,
    });

    const appModuleDecorator = appModuleFile
        .getClass("AppModule")
        .getDecorator("Module");
    const appModuleArguments = appModuleDecorator
        .getArguments()[0]
        .asKind(SyntaxKind.ObjectLiteralExpression) as ObjectLiteralExpression;
    const controllerList = (
        appModuleArguments
            .getProperty("imports")
            .asKind(SyntaxKind.PropertyAssignment) as PropertyAssignment
    ).getInitializerIfKind(
        SyntaxKind.ArrayLiteralExpression,
    ) as ArrayLiteralExpression;

    const alreadyIncluded = controllerList
        .getElements()
        .some((schema) => schema.getText() === baseInfo.modelClassName);
    if (alreadyIncluded) {
        throw new Error(
            `Module '${baseInfo.modelClassName}' already exists at file path: ${appModuleFilePath}`,
        );
    }
    controllerList.addElements([baseInfo.moduleClassName]);
}

function generateEntity(options: { baseInfo: BaseInfo; project: Project }) {
    const { baseInfo, project } = options;
    const entityFile = project.createSourceFile(baseInfo.entityFilePath, "", {
        overwrite: false,
    });
    entityFile.addImportDeclaration({
        namedImports: ["BaseEntity"],
        moduleSpecifier: "@common/interface/base-entity.interface",
    });
    const entityClass = entityFile.addClass({
        name: baseInfo.entityClassName,
        isExported: true,
        implements: ["BaseEntity"],
    });
    entityClass.addProperty({
        name: "_id",
        type: "string",
    });
    const entityListPath = "src/modules/repository/common/entity.ts";
    const entityListFile = project.getSourceFile(entityListPath);
    if (entityListFile.getVariableDeclaration(baseInfo.entityConstantName)) {
        throw new Error(
            `Entity '${baseInfo.entityConstantName}' already exists at file path: ${entityListPath}`,
        );
    }
    entityListFile.addVariableStatement({
        declarationKind: VariableDeclarationKind.Const,
        isExported: true,
        declarations: [
            {
                name: baseInfo.entityConstantName,
                initializer: `"${baseInfo.entityClassName}"`,
            },
        ],
    });
}

function generateDto(options: { baseInfo: BaseInfo; project: Project }) {
    const { baseInfo, project } = options;

    // Condition Dto
    const conditionDtoFile = project.createSourceFile(
        baseInfo.conditionDtoFilePath,
        "",
        {
            overwrite: false,
        },
    );

    conditionDtoFile.addImportDeclarations([
        {
            namedImports: ["PartialType"],
            moduleSpecifier: "@nestjs/swagger",
        },
        {
            namedImports: [baseInfo.entityClassName],
            moduleSpecifier: baseInfo.entityImportPath,
        },
    ]);
    conditionDtoFile.addClass({
        name: baseInfo.conditionDtoClassName,
        isExported: true,
        extends: `PartialType(${baseInfo.entityClassName})`,
    });

    // Create Dto
    const createDtoFile = project.createSourceFile(
        baseInfo.createDtoFilePath,
        "",
        {
            overwrite: false,
        },
    );

    createDtoFile.addImportDeclarations([
        {
            namedImports: ["OmitType"],
            moduleSpecifier: "@nestjs/swagger",
        },
        {
            namedImports: [baseInfo.entityClassName],
            moduleSpecifier: baseInfo.entityImportPath,
        },
    ]);
    createDtoFile.addClass({
        name: baseInfo.createDtoClassName,
        isExported: true,
        extends: `OmitType(${baseInfo.entityClassName}, ["_id"])`,
    });

    // Update Dto
    const updateDtoFile = project.createSourceFile(
        baseInfo.updateDtoFilePath,
        "",
        {
            overwrite: false,
        },
    );

    updateDtoFile.addImportDeclarations([
        {
            namedImports: ["PartialType"],
            moduleSpecifier: "@nestjs/swagger",
        },
        {
            namedImports: [baseInfo.createDtoClassName],
            moduleSpecifier: baseInfo.createDtoImportPath,
        },
    ]);
    updateDtoFile.addClass({
        name: baseInfo.updateDtoClassName,
        isExported: true,
        extends: `PartialType(${baseInfo.createDtoClassName})`,
    });
}

function generateMongoModel(options: { baseInfo: BaseInfo; project: Project }) {
    const { baseInfo, project } = options;
    const entityFile = project.getSourceFile(baseInfo.entityFilePath);
    const entityClass = entityFile.getClass(baseInfo.entityClassName);
    entityFile.addImportDeclarations([
        {
            namedImports: ["Entity"],
            moduleSpecifier: "@module/repository",
        },
        {
            namedImports: ["Schema", "SchemaFactory"],
            moduleSpecifier: "@nestjs/mongoose",
        },
        {
            namedImports: ["HydratedDocument"],
            moduleSpecifier: "mongoose",
        },
        {
            namedImports: ["StrObjectId"],
            moduleSpecifier: "@common/constant",
        },
    ]);
    entityClass.addDecorator({
        name: "Schema",
        arguments: [
            `{ collection: Entity.${baseInfo.entityConstantName}, timestamps: true, toJSON: { virtuals: true } }`,
        ],
    });
    entityClass
        .getProperty("_id")
        .addDecorator({ name: "StrObjectId", arguments: [""] });
    entityFile.addTypeAlias({
        name: `${baseInfo.entityClassName}Document`,
        type: `HydratedDocument<${baseInfo.entityClassName}>`,
        isExported: true,
    });
    const schemaName = `${baseInfo.entityClassName}Schema`;
    entityFile.addVariableStatement({
        declarationKind: VariableDeclarationKind.Const,
        declarations: [
            {
                name: schemaName,
                initializer: `SchemaFactory.createForClass(${baseInfo.entityClassName})`,
            },
        ],
        isExported: true,
    });
    const mongoSchemaPath = "src/modules/repository/mongo/mongoose-model.ts";
    const mongoSchemaFile = project.getSourceFile(mongoSchemaPath);
    mongoSchemaFile.addImportDeclaration({
        namedImports: [schemaName],
        moduleSpecifier: baseInfo.entityImportPath,
    });
    const schemaList = mongoSchemaFile
        .getVariableDeclaration("SCHEMA_LIST")
        .getInitializerIfKind(
            SyntaxKind.ArrayLiteralExpression,
        ) as ArrayLiteralExpression;
    const alreadyIncluded = schemaList
        .getElements()
        .some((schema) => schema.getText() === schemaName);
    if (alreadyIncluded) {
        throw new Error(
            `Mongo schema '${schemaName}' already exists at file path: ${mongoSchemaPath}`,
        );
    }

    schemaList.addElement(schemaName, { useNewLines: true });
}

function generateSqlModel(options: { baseInfo: BaseInfo; project: Project }) {
    const { baseInfo, project } = options;
    const modelFile = project.createSourceFile(baseInfo.modelFilePath, "", {
        overwrite: false,
    });
    modelFile.addImportDeclarations([
        {
            namedImports: ["Entity"],
            moduleSpecifier: "@module/repository",
        },
        {
            namedImports: ["Table", "Model"],
            moduleSpecifier: "sequelize-typescript",
        },
        {
            namedImports: ["StrObjectId"],
            moduleSpecifier: "@common/constant",
        },
        {
            namedImports: [baseInfo.entityClassName],
            moduleSpecifier: baseInfo.entityImportPath,
        },
    ]);
    const modelClass = modelFile.addClass({
        name: baseInfo.modelClassName,
        isExported: true,
        extends: "Model",
        implements: [baseInfo.entityClassName],
        decorators: [
            {
                name: "Table",
                arguments: [
                    `{ tableName: Entity.${baseInfo.entityConstantName} }`,
                ],
            },
        ],
    });
    modelClass.addProperty({
        name: "_id",
        type: "string",
        decorators: [{ name: "StrObjectId", arguments: [""] }],
    });

    const sequelizeModelPath =
        "src/modules/repository/sequelize/common/sequelize-model.ts";
    const sequelizeModelFile = project.getSourceFile(sequelizeModelPath);
    sequelizeModelFile.addImportDeclaration({
        namedImports: [baseInfo.modelClassName],
        moduleSpecifier: baseInfo.modelImportPath,
    });
    const modelList = sequelizeModelFile
        .getVariableDeclaration("SequelizeModel")
        .getInitializerIfKind(
            SyntaxKind.ArrayLiteralExpression,
        ) as ArrayLiteralExpression;
    const alreadyIncluded = modelList
        .getElements()
        .some((schema) => schema.getText() === baseInfo.modelClassName);
    if (alreadyIncluded) {
        throw new Error(
            `Sequelize model '${baseInfo.modelClassName}' already exists at file path: ${sequelizeModelPath}`,
        );
    }
    modelList.addElement(baseInfo.modelClassName, { useNewLines: true });
}

function generateModel(options: { baseInfo: BaseInfo; project: Project }) {
    switch (options.baseInfo.repositoryType) {
        case RepositoryType.MONGO: {
            return generateMongoModel(options);
        }
        case RepositoryType.SQL: {
            return generateSqlModel(options);
        }
    }
}

function generateRepositoryInterface(options: {
    baseInfo: BaseInfo;
    project: Project;
}) {
    const { baseInfo, project } = options;
    const repoInterfaceFile = project.createSourceFile(
        baseInfo.repositoryInterfaceFilePath,
        "",
        { overwrite: false },
    );
    repoInterfaceFile.addImportDeclarations([
        {
            namedImports: ["BaseRepository"],
            moduleSpecifier:
                "@module/repository/common/base-repository.interface",
        },
        {
            namedImports: [baseInfo.entityClassName],
            moduleSpecifier: baseInfo.entityImportPath,
        },
    ]);
    repoInterfaceFile.addInterface({
        name: baseInfo.repositoryInterfaceName,
        isExported: true,
        extends: [`BaseRepository<${baseInfo.entityClassName}>`],
    });
}

function generateMongoRepository(options: {
    baseInfo: BaseInfo;
    project: Project;
}) {
    const { baseInfo, project } = options;
    const repoMongoFile = project.createSourceFile(
        baseInfo.mongoRepositoryFilePath,
        "",
        { overwrite: false },
    );
    repoMongoFile.addImportDeclarations([
        {
            namedImports: ["MongoRepository"],
            moduleSpecifier: "@module/repository/mongo/mongo.repository",
        },
        {
            namedImports: ["InjectModel"],
            moduleSpecifier: "@nestjs/mongoose",
        },
        {
            namedImports: ["Model"],
            moduleSpecifier: "mongoose",
        },
        {
            namedImports: [baseInfo.repositoryInterfaceName],
            moduleSpecifier: baseInfo.repositoryInterfaceImportPath,
        },
        {
            namedImports: [baseInfo.entityClassName],
            moduleSpecifier: baseInfo.entityImportPath,
        },
        {
            namedImports: ["Entity"],
            moduleSpecifier: "@module/repository",
        },
    ]);
    const repoMongoClass = repoMongoFile.addClass({
        name: baseInfo.repositoryMongoClassName,
        isExported: true,
        extends: `MongoRepository<${baseInfo.entityClassName}>`,
        implements: [baseInfo.repositoryInterfaceName],
    });
    const modelName = _.lowerFirst(baseInfo.modelClassName);
    repoMongoClass.addConstructor({
        parameters: [
            {
                name: modelName,
                scope: Scope.Private,
                isReadonly: true,
                type: `Model<${baseInfo.entityClassName}>`,
                decorators: [
                    {
                        name: "InjectModel",
                        arguments: [`Entity.${baseInfo.entityConstantName}`],
                    },
                ],
            },
        ],
        statements: [`super(${modelName})`],
    });
}

function generateSqlRepository(options: {
    baseInfo: BaseInfo;
    project: Project;
}) {
    const { baseInfo, project } = options;
    const repoSqlFile = project.createSourceFile(
        baseInfo.sqlRepositoryFilePath,
        "",
        { overwrite: false },
    );
    repoSqlFile.addImportDeclarations([
        {
            namedImports: ["SqlRepository"],
            moduleSpecifier: "@module/repository/sequelize/sql.repository",
        },
        {
            namedImports: ["InjectModel"],
            moduleSpecifier: "@nestjs/sequelize",
        },
        {
            namedImports: [baseInfo.repositoryInterfaceName],
            moduleSpecifier: baseInfo.repositoryInterfaceImportPath,
        },
        {
            namedImports: [baseInfo.entityClassName],
            moduleSpecifier: baseInfo.entityImportPath,
        },
        {
            namedImports: [baseInfo.modelClassName],
            moduleSpecifier: baseInfo.modelImportPath,
        },
    ]);
    const repoSqlClass = repoSqlFile.addClass({
        name: baseInfo.repositorySqlClassName,
        isExported: true,
        extends: `SqlRepository<${baseInfo.entityClassName}>`,
        implements: [baseInfo.repositoryInterfaceName],
    });
    const modelName = _.lowerFirst(baseInfo.modelClassName);
    repoSqlClass.addConstructor({
        parameters: [
            {
                name: modelName,
                scope: Scope.Private,
                isReadonly: true,
                type: `typeof ${baseInfo.modelClassName}`,
                decorators: [
                    {
                        name: "InjectModel",
                        arguments: [baseInfo.modelClassName],
                    },
                ],
            },
        ],
        statements: [`super(${modelName})`],
    });
}

function generateRepository(options: { baseInfo: BaseInfo; project: Project }) {
    generateRepositoryInterface(options);
    switch (options.baseInfo.repositoryType) {
        case RepositoryType.MONGO: {
            generateMongoRepository(options);
            break;
        }
        case RepositoryType.SQL: {
            generateSqlRepository(options);
            break;
        }
    }
}

function generateService(options: { baseInfo: BaseInfo; project: Project }) {
    const { baseInfo, project } = options;
    const serviceFile = project.createSourceFile(baseInfo.serviceFilePath, "", {
        overwrite: false,
    });
    serviceFile.addImportDeclarations([
        {
            namedImports: ["Injectable"],
            moduleSpecifier: "@nestjs/common",
        },
        {
            namedImports: ["BaseService"],
            moduleSpecifier: "@config/service/base.service",
        },
        {
            namedImports: [baseInfo.repositoryInterfaceName],
            moduleSpecifier: baseInfo.repositoryInterfaceImportPath,
        },
        {
            namedImports: [baseInfo.entityClassName],
            moduleSpecifier: baseInfo.entityImportPath,
        },
        {
            namedImports: ["InjectRepository"],
            moduleSpecifier: "@module/repository/common/repository",
        },
        {
            namedImports: ["Entity"],
            moduleSpecifier: "@module/repository",
        },
    ]);
    const serviceClass = serviceFile.addClass({
        name: baseInfo.serviceClassName,
        isExported: true,
        extends: `BaseService<${baseInfo.entityClassName}, ${baseInfo.repositoryInterfaceName}>`,
        decorators: [{ name: "Injectable", arguments: [""] }],
    });
    const repositoryName = _.lowerFirst(baseInfo.repositoryInterfaceName);
    serviceClass.addConstructor({
        parameters: [
            {
                name: repositoryName,
                scope: Scope.Private,
                isReadonly: true,
                type: baseInfo.repositoryInterfaceName,
                decorators: [
                    {
                        name: "InjectRepository",
                        arguments: [`Entity.${baseInfo.entityConstantName}`],
                    },
                ],
            },
        ],
        statements: [`super(${repositoryName})`],
    });
    const moduleFile = project.getSourceFile(baseInfo.moduleFilePath);
    moduleFile.addImportDeclarations([
        {
            namedImports: ["RepositoryProvider"],
            moduleSpecifier: "@module/repository/common/repository",
        },
        {
            namedImports: ["TransactionProvider"],
            moduleSpecifier: "@module/repository/common/transaction",
        },
        {
            namedImports: ["Entity"],
            moduleSpecifier: "@module/repository",
        },
        {
            namedImports: [baseInfo.serviceClassName],
            moduleSpecifier: baseInfo.serviceImportPath,
        },
    ]);

    const moduleDecorator = moduleFile
        .getClass(baseInfo.moduleClassName)
        .getDecorator("Module");
    const moduleArguments = moduleDecorator
        .getArguments()[0]
        .asKind(SyntaxKind.ObjectLiteralExpression) as ObjectLiteralExpression;
    const providerList = (
        moduleArguments
            .getProperty("providers")
            .asKind(SyntaxKind.PropertyAssignment) as PropertyAssignment
    ).getInitializerIfKind(
        SyntaxKind.ArrayLiteralExpression,
    ) as ArrayLiteralExpression;
    providerList.addElement(baseInfo.serviceClassName);
    switch (baseInfo.repositoryType) {
        case "mongo": {
            moduleFile.addImportDeclarations([
                {
                    namedImports: [baseInfo.repositoryMongoClassName],
                    moduleSpecifier: baseInfo.mongoRepositoryImportPath,
                },
                {
                    namedImports: ["MongoTransaction"],
                    moduleSpecifier:
                        "@module/repository/mongo/mongo.transaction",
                },
            ]);
            providerList.addElements([
                `RepositoryProvider(Entity.${baseInfo.entityConstantName}, ${baseInfo.repositoryMongoClassName})`,
                `TransactionProvider(MongoTransaction)`,
            ]);
            break;
        }
        case "sql": {
            moduleFile.addImportDeclarations([
                {
                    namedImports: [baseInfo.repositorySqlClassName],
                    moduleSpecifier: baseInfo.sqlRepositoryImportPath,
                },
                {
                    namedImports: ["SqlTransaction"],
                    moduleSpecifier:
                        "@module/repository/sequelize/sql.transaction",
                },
            ]);

            providerList.addElements([
                `RepositoryProvider(Entity.${baseInfo.entityConstantName}, ${baseInfo.repositorySqlClassName})`,
                `TransactionProvider(SqlTransaction)`,
            ]);
            break;
        }
    }
}

function generateController(options: { baseInfo: BaseInfo; project: Project }) {
    const { baseInfo, project } = options;
    const controllerFile = project.createSourceFile(
        baseInfo.controllerFilePath,
        "",
        {
            overwrite: false,
        },
    );
    controllerFile.addImportDeclarations([
        {
            namedImports: ["Controller"],
            moduleSpecifier: "@nestjs/common",
        },
        {
            namedImports: ["ApiTags"],
            moduleSpecifier: "@nestjs/swagger",
        },
        {
            namedImports: ["BaseControllerFactory"],
            moduleSpecifier: "@config/controller/base-controller-factory",
        },
        {
            namedImports: [baseInfo.serviceClassName],
            moduleSpecifier: baseInfo.serviceImportPath,
        },
        {
            namedImports: [baseInfo.entityClassName],
            moduleSpecifier: baseInfo.entityImportPath,
        },
        {
            namedImports: [baseInfo.conditionDtoClassName],
            moduleSpecifier: baseInfo.conditionDtoImportPath,
        },
        {
            namedImports: [baseInfo.createDtoClassName],
            moduleSpecifier: baseInfo.createDtoImportPath,
        },
        {
            namedImports: [baseInfo.updateDtoClassName],
            moduleSpecifier: baseInfo.updateDtoImportPath,
        },
    ]);
    const controllerClass = controllerFile.addClass({
        name: baseInfo.controllerClassName,
        isExported: true,
        extends: `BaseControllerFactory<${baseInfo.entityClassName}>(
    ${baseInfo.entityClassName},
    ${baseInfo.conditionDtoClassName},
    ${baseInfo.createDtoClassName},
    ${baseInfo.updateDtoClassName},
)`,
        decorators: [
            { name: "Controller", arguments: [`"${baseInfo.entity}"`] },
            { name: "ApiTags", arguments: [`"${baseInfo.entity}"`] },
        ],
    });
    const serviceName = _.lowerFirst(baseInfo.serviceClassName);
    controllerClass.addConstructor({
        parameters: [
            {
                name: serviceName,
                scope: Scope.Private,
                isReadonly: true,
                type: baseInfo.serviceClassName,
            },
        ],
        statements: [`super(${serviceName})`],
    });
    const moduleFile = project.getSourceFile(baseInfo.moduleFilePath);
    moduleFile.addImportDeclarations([
        {
            namedImports: [baseInfo.controllerClassName],
            moduleSpecifier: baseInfo.controllerImportPath,
        },
    ]);

    const moduleDecorator = moduleFile
        .getClass(baseInfo.moduleClassName)
        .getDecorator("Module");
    const moduleArguments = moduleDecorator
        .getArguments()[0]
        .asKind(SyntaxKind.ObjectLiteralExpression) as ObjectLiteralExpression;
    const controllerList = (
        moduleArguments
            .getProperty("controllers")
            .asKind(SyntaxKind.PropertyAssignment) as PropertyAssignment
    ).getInitializerIfKind(
        SyntaxKind.ArrayLiteralExpression,
    ) as ArrayLiteralExpression;
    controllerList.addElements([baseInfo.controllerClassName]);
}

export function generateBase(options: {
    entity: string;
    repositoryType: RepositoryType;
}) {
    const { entity } = options;
    if (!entity) {
        CliError(
            `"entity" must be provided: aisoft base [entity] ([sql|mongo])`,
        );
        return;
    }

    const repositoryType = options.repositoryType || RepositoryType.SQL;
    if (!Object.values(RepositoryType).includes(repositoryType)) {
        CliError(
            `'${repositoryType}' is not valid repository type. Valid types: 'mongo', 'sql'`,
        );
        return;
    }
    try {
        const baseInfo = getBaseInfo(entity, repositoryType);
        const project = new Project({
            tsConfigFilePath: "tsconfig.json",
        });
        const generateOptions = { baseInfo, project };
        generateModule(generateOptions);
        generateEntity(generateOptions);
        generateDto(generateOptions);
        generateModel(generateOptions);
        generateRepository(generateOptions);
        generateService(generateOptions);
        generateController(generateOptions);
        project.saveSync();
    } catch (err) {
        CliError(err.stack);
    }
}
