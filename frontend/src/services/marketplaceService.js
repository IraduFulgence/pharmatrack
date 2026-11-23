import { ApiRequest } from "./auth";

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

  confirmStock: async (orderId) =>
    ApiRequest(`/pharmacy/marketplace/orders/${orderId}/confirm-stock`, { method: 'PATCH' }),

  // Online catalogue (admin only)
  getMedicines: async () => ApiRequest('/pharmacy/marketplace/medicines', { method: 'GET' }),

  setAvailability: async (medicineId, available) =>
    ApiRequest(`/pharmacy/marketplace/medicines/${medicineId}/availability`, {
      method: 'PATCH',
      body: JSON.stringify({ available }),
    }),

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
