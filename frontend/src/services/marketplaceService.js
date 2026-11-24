import { ApiRequest } from "./auth";
import { API_BASE_URL } from "../utils/api";

// Pharmacy side of the patient marketplace. The backend takes the pharmacy
// from the login, so no pharmacyId is sent.
export const marketplaceService = {
  // status: PENDING | ACCEPTED | REJECTED | READY_FOR_COLLECTION | COMPLETED | CANCELLED (optional)
  getOrders: async (status) =>
    ApiRequest(`/pharmacy/marketplace/orders${status ? `?status=${encodeURIComponent(status)}` : ''}`, { method: 'GET' }),

  // { order, items: [{ ..., allocations: [{ inventory_id, batch_number, quantity, unit_price }], short_by }] }
  getOrder: async (orderId) => ApiRequest(`/pharmacy/marketplace/orders/${orderId}`, { method: 'GET' }),

  acceptOrder: async (orderId) =>
    ApiRequest(`/pharmacy/marketplace/orders/${orderId}/accept`, { method: 'PATCH' }),

  rejectOrder: async (orderId, reason) =>
    ApiRequest(`/pharmacy/marketplace/orders/${orderId}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),

  markReady: async (orderId) =>
    ApiRequest(`/pharmacy/marketplace/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'READY_FOR_COLLECTION' }),
    }),

  // The prescription photo a patient attached, as an object URL for <img>.
  // Call URL.revokeObjectURL(url) when done with it.
  getPrescriptionImageUrl: async (orderId) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/pharmacy/marketplace/orders/${orderId}/prescription-image`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      let message = 'Could not load the prescription photo.';
      try { message = (await res.json()).message || message; } catch { /* not JSON */ }
      throw new Error(message);
    }
    return URL.createObjectURL(await res.blob());
  },

  confirmStock: async (orderId) =>
    ApiRequest(`/pharmacy/marketplace/orders/${orderId}/confirm-stock`, { method: 'PATCH' }),

  // Online catalogue (admin only)
  getMedicines: async () => ApiRequest('/pharmacy/marketplace/medicines', { method: 'GET' }),

  setAvailability: async (medicineId, available) =>
    ApiRequest(`/pharmacy/marketplace/medicines/${medicineId}/availability`, {
      method: 'PATCH',
      body: JSON.stringify({ available }),
    }),

  // Photo shown to patients for this medicine (shared by all pharmacies).
  // JPEG, PNG or WebP, max 5 MB.
  uploadMedicineImage: async (medicineId, file) => {
    const form = new FormData();
    form.append('image', file);
    return ApiRequest(`/pharmacy/marketplace/medicines/${medicineId}/image`, {
      method: 'POST',
      body: form,
    });
  },

  // Full URL for an image_url returned by the API; `version` busts the browser cache after an upload.
  imageSrc: (imageUrl, version) =>
    imageUrl ? `${API_BASE_URL}${imageUrl}${version ? `?v=${version}` : ''}` : null,

  setPrice: async (medicineId, price) =>
    ApiRequest(`/pharmacy/marketplace/medicines/${medicineId}/price`, {
      method: 'PATCH',
      body: JSON.stringify({ price }),
    }),
};

export const ORDER_STATUS = {
  PENDING: { label: 'New', tone: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  ACCEPTED: { label: 'Accepted', tone: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  READY_FOR_COLLECTION: { label: 'Ready for pickup', tone: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  COMPLETED: { label: 'Collected', tone: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  REJECTED: { label: 'Rejected', tone: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  CANCELLED: { label: 'Cancelled by patient', tone: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
};

export const PAYMENT_LABELS = {
  CASH_ON_COLLECTION: 'Pay at pickup',
  MOBILE_MONEY: 'Mobile Money',
};
