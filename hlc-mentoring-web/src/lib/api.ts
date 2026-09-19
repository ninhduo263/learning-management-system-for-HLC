const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'https://learning-management-system-for-hlc.onrender.com/api'
).replace(/\/+$/, '');

export function apiUrl(path: string) {
  return `${API_URL}/${path.replace(/^\/+/, '')}`;
}

export function getAuthToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('hlc_token') : null;
}

export function apiFetch(path: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(apiUrl(path), { ...options, headers });
}
