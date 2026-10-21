import { BaseControllerConfig } from "./base-controller.interface";

const disabled = { enable: false };

/**
 * Cấu hình CRUD mặc định cho các module HLC (mọi route chỉ dành cho Admin).
 * - Tắt upsert / getOneOrUpsert vì các service không khai báo upsertKeys.
 * - readOnly: chỉ đọc + export (dữ liệu do hệ thống sinh, vd PointEntry).
 * - enableImport: bật import Excel.
 */
export const CrudControllerConfig = (
    options: { readOnly?: boolean; enableImport?: boolean } = {},
): BaseControllerConfig => ({
    authorize: true,
    import: { enable: Boolean(options.enableImport) },
    routes: {
        upsert: disabled,
        getOneOrUpsert: disabled,
        ...(options.readOnly
            ? {
                  create: disabled,
                  updateById: disabled,
                  updateByIds: disabled,
                  deleteById: disabled,
                  deleteByIds: disabled,
              }
            : {}),
    },
});
