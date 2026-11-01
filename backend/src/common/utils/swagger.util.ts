class SwaggerUtilLoader {
    sort;
}

export const SwaggerUtil: SwaggerUtilLoader =
    global.SwaggerUtil || (global.SwaggerUtil = new SwaggerUtilLoader());
