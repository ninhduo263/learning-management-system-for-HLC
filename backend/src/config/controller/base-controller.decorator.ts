import { ApiCommonErrorDocs } from "@common/decorator/api.decorator";
import {
    AllowSystemRoles,
    Authorization,
    EnableDataPartition,
    RequireDataPartition,
} from "@common/decorator/auth.decorator";
import {
    BaseControllerConfig,
    BaseRoute,
} from "@config/controller/base-controller.interface";
import { UseAuditLog } from "@module/audit-log/common/constant";
import { SystemRole } from "@module/user/common/constant";
import { Delete, Get, Patch, Post, Put, applyDecorators } from "@nestjs/common";

export const BaseControllerSetup = (config: BaseControllerConfig) => {
    const decorators: Array<ClassDecorator> = [];

    const authorization = config?.authorize ?? true;
    if (authorization) {
        decorators.push(Authorization());
        const controllerRoles = config?.roles;
        if (controllerRoles) {
            decorators.push(AllowSystemRoles(...controllerRoles));
        }
        const enableDataPartition = config?.dataPartition?.enable;
        decorators.push(EnableDataPartition(enableDataPartition));
        if (enableDataPartition) {
            const requireDataPartition = config?.dataPartition?.require;
            decorators.push(RequireDataPartition(requireDataPartition));
        }
    }

    return applyDecorators(...decorators, ApiCommonErrorDocs());
};

const BaseRoutePath: { [key in BaseRoute]: string } = {
    create: "",
    getById: ":id",
    getOne: "one",
    getMany: "many",
    getPage: "page",
    updateById: ":id",
    updateByIds: "many/ids",
    upsert: "upsert",
    getOneOrUpsert: "/one/upsert",
    deleteById: ":id",
    deleteByIds: "many/ids",
    importDefinition: "import/definition",
    importXlsxTemplate: "import/template/xlsx",
    importValidate: "import/validate",
    importInsert: "import/insert",
    exportDefinition: "export/definition",
    exportXlsx: "export/xlsx",
};

export const BaseRouteSetup = (
    route: BaseRoute,
    config: BaseControllerConfig,
    method: "get" | "post" | "put" | "patch" | "delete",
) => {
    const routeConfig = config?.routes?.[route] || {};

    const enable = routeConfig.enable ?? true;
    if (!enable) {
        return applyDecorators();
    }
    const importRoute: BaseRoute[] = [
        "importDefinition",
        "importXlsxTemplate",
        "importValidate",
        "importInsert",
    ];

    const useImport = config.import?.enable ?? true;
    if (importRoute.includes(route) && useImport !== true) {
        return applyDecorators();
    }

    const decorators: MethodDecorator[] = [];
    const authorization = config?.authorize ?? true;
    if (authorization) {
        const routeRoles = routeConfig.roles ||
            config?.roles || [SystemRole.ADMIN];
        if (routeRoles) {
            decorators.push(AllowSystemRoles(...routeRoles));
        }

        const enableDataPartition = routeConfig?.dataPartition?.enable;
        decorators.push(EnableDataPartition(enableDataPartition));
        if (enableDataPartition) {
            const requireDataPartition = routeConfig?.dataPartition?.require;
            decorators.push(RequireDataPartition(requireDataPartition));
        }
    }

    if (routeConfig.auditLog) {
        decorators.push(UseAuditLog(routeConfig.auditLog));
    }

    const path = BaseRoutePath[route] ?? "undefined";

    switch (method) {
        case "get": {
            decorators.push(Get(path));
            break;
        }
        case "post": {
            decorators.push(Post(path));
            break;
        }
        case "put": {
            decorators.push(Put(path));
            break;
        }
        case "patch": {
            decorators.push(Patch(path));
            break;
        }
        case "delete": {
            decorators.push(Delete(path));
            break;
        }
        default: {
            break;
        }
    }
    return applyDecorators(...decorators);
};
