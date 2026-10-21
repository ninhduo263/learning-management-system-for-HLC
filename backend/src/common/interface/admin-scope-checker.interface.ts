/** Token để guard hỏi quyền admin theo phạm vi mà không import module permission. */
export const ADMIN_SCOPE_CHECKER = "AdminScopeChecker";

export interface AdminScopeChecker {
    hasScope(userId: string, scope: string): Promise<boolean>;
}
