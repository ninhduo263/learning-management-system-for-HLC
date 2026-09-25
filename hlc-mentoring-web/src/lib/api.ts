const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '');

function getApiBaseUrl() {
  const isLocalBrowser = typeof window !== 'undefined'
    && ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  const defaultApiUrl = isLocalBrowser || process.env.NODE_ENV === 'development'
    ? 'http://localhost:5000'
    : 'https://learning-management-system-for-hlc.onrender.com';
  const baseUrl = configuredApiUrl || defaultApiUrl;
  return baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
}

export function apiUrl(path: string) {
  return `${getApiBaseUrl()}/${path.replace(/^\/+/, '')}`;
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
