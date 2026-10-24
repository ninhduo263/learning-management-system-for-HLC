const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '');

const ACCESS_TOKEN_KEY = 'hlc_token';
const REFRESH_TOKEN_KEY = 'hlc_refresh_token';
const USER_KEY = 'hlc_user';

export type AppRole = 'ADMIN' | 'MENTOR' | 'MENTEE';

export interface SessionUser {
  /** Mã thành viên (HLC-MTE-xxxxx) hoặc username với admin */
  userId: string;
  fullName: string;
  role: AppRole;
}

function getApiBaseUrl() {
  return configuredApiUrl || 'http://localhost:5000';
}

export function apiUrl(path: string) {
  return `${getApiBaseUrl()}/${path.replace(/^\/+/, '')}`;
}

export function getAuthToken() {
  return typeof window !== 'undefined' ? localStorage.getItem(ACCESS_TOKEN_KEY) : null;
}

export function saveSession(tokens: { accessToken: string; refreshToken: string }, user?: SessionUser) {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getSessionUser(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(USER_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

let refreshing: Promise<boolean> | null = null;

/** Làm mới access token bằng refresh token (gộp các lần gọi đồng thời) */
async function refreshAccessToken() {
  const refreshToken = typeof window !== 'undefined' ? localStorage.getItem(REFRESH_TOKEN_KEY) : null;
  if (!refreshToken) return false;
  refreshing ??= fetch(apiUrl('/auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  })
    .then(async (response) => {
      if (!response.ok) return false;
      const result = await response.json();
      saveSession(result.data);
      return true;
    })
    .catch(() => false)
    .finally(() => { refreshing = null; });
  return refreshing;
}

function redirectToLogin() {
  clearSession();
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

export async function apiFetch(path: string, options: RequestInit = {}, retry = true): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(apiUrl(path), { ...options, headers });
  const isAuthCall = path.replace(/^\/+/, '').startsWith('auth/');
  if (response.status === 401 && retry && !isAuthCall && token) {
    if (await refreshAccessToken()) return apiFetch(path, options, false);
    redirectToLogin();
  }
  return response;
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) {
    super(message);
  }
}

/** Gọi API JSON: trả `data` khi thành công, ném ApiError (message tiếng Việt từ backend) khi lỗi */
export async function apiJson<T = unknown>(path: string, options: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = options;
  const response = await apiFetch(path, json !== undefined ? { ...rest, body: JSON.stringify(json) } : rest);
  let result: { success?: boolean; data?: T; message?: string; code?: string } = {};
  try {
    result = await response.json();
  } catch {
    throw new ApiError(`Máy chủ trả về phản hồi không hợp lệ (HTTP ${response.status})`, response.status);
  }
  if (!response.ok || !result.success) {
    throw new ApiError(result.message || `Yêu cầu thất bại (HTTP ${response.status})`, response.status, result.code);
  }
  return result.data as T;
}

/** Tải file nhị phân (Excel...) và lưu về máy */
export async function downloadFile(path: string, fileName: string, options: RequestInit = {}) {
  const response = await apiFetch(path, options);
  if (!response.ok) {
    let message = 'Không thể tải file';
    try {
      message = (await response.json()).message || message;
    } catch { /* bỏ qua */ }
    throw new ApiError(message, response.status);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  // Ưu tiên tên file máy chủ đặt (nếu trình duyệt đọc được header)
  const served = /filename="?([^";]+)"?/.exec(response.headers.get('content-disposition') ?? '')?.[1];
  link.download = served || fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const errorMessage = (error: unknown, fallback = 'Đã có lỗi xảy ra') =>
  error instanceof Error ? error.message : fallback;
