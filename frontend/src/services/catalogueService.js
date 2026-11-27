import { ApiRequest } from "./auth";
import { API_BASE_URL } from "../utils/api";

// Shared medicine catalogue, curated by system admins.

/** Download a file from the API (with the login token) and save it. */
export const downloadFile = async (endpoint, fallbackName) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    let message = 'Could not download the file.';
    try { message = (await res.json()).message || message; } catch { /* not JSON */ }
    throw new Error(message);
  }
  const disposition = res.headers.get('content-disposition') || '';
  const name = /filename="?([^"]+)"?/.exec(disposition)?.[1] || fallbackName;
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const fileForm = (file) => {
  const form = new FormData();
  form.append('file', file);
  return form;
};

export const catalogueService = {
  list: ({ q, categoryId, scope, page = 1, limit = 50 } = {}) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (q?.trim()) params.set('q', q.trim());
    if (categoryId) params.set('categoryId', String(categoryId));
    if (scope) params.set('scope', scope);
    return ApiRequest(`/admin/medicines?${params.toString()}`, { method: 'GET' });
  },

  get: (id) => ApiRequest(`/admin/medicines/${id}`, { method: 'GET' }),

  create: (medicine) => ApiRequest('/admin/medicines', { method: 'POST', body: JSON.stringify(medicine) }),

  update: (id, changes) => ApiRequest(`/admin/medicines/${id}`, { method: 'PATCH', body: JSON.stringify(changes) }),

  categories: () => ApiRequest('/admin/medicines/categories', { method: 'GET' }),

  createCategory: (categoryName, description) =>
    ApiRequest('/admin/medicines/categories', {
      method: 'POST',
      body: JSON.stringify(description ? { categoryName, description } : { categoryName }),
    }),

  downloadTemplate: (format = 'xlsx') =>
    downloadFile(`/admin/medicines/import/template?format=${format}`, `pharmatrack_medicine_catalogue_template.${format}`),

  previewImport: (file) => ApiRequest('/admin/medicines/import/preview', { method: 'POST', body: fileForm(file) }),

  importCatalogue: (file) => ApiRequest('/admin/medicines/import', { method: 'POST', body: fileForm(file) }),
};
