import axios from 'axios';

// Same origin as the site (Vite proxies /api in development), so the
// HTTP-only login cookie is sent automatically.
export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 20000,
});

/** Human-readable message from any API or network error. */
export function errorMessage(err, fallback = 'Something went wrong. Try again.') {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.code === 'ECONNABORTED') return 'The server took too long to answer. Try again.';
  if (err?.request && !err?.response) return 'Cannot reach the server. Check your connection.';
  return fallback;
}

/** Copies { field: message } errors from the API onto React Hook Form fields. Returns true if any were applied. */
export function applyServerErrors(err, setError, fields) {
  const errors = err?.response?.data?.errors;
  if (!errors) return false;
  let applied = false;
  for (const [field, message] of Object.entries(errors)) {
    if (!fields || fields.includes(field)) {
      setError(field, { type: 'server', message });
      applied = true;
    }
  }
  return applied;
}

/** Downloads a file from an API route (keeps the cookie, shows errors properly). */
export async function downloadFile(url, fallbackName) {
  const res = await api.get(url, { responseType: 'blob' });
  const header = res.headers['content-disposition'] || '';
  const name = /filename="([^"]+)"/.exec(header)?.[1] || fallbackName;
  const href = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
