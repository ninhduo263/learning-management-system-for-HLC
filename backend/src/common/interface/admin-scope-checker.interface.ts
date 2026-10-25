/** Token để guard hỏi quyền admin theo phạm vi mà không import module permission. */
export const ADMIN_SCOPE_CHECKER = "AdminScopeChecker";

export interface AdminScopeChecker {
    /**
     * `write = true` khi request thay đổi dữ liệu (POST / PUT / PATCH / DELETE): chỉ tính phạm vi được cấp thật sự
     * (hoặc bao hàm quyền ghi), không tính phạm vi "chỉ xem" được bao hàm.
     */
    hasScope(userId: string, scope: string, write?: boolean): Promise<boolean>;
}
