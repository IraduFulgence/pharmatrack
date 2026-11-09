import { ApiRequest } from "./auth";

export const inventoryService = {
  getDashboard: async () => {
    return ApiRequest('/inventory/dashboard', { method: 'GET' });
  },
  getAlerts: async () => {
    return ApiRequest('/inventory/alerts', { method: 'GET' });
  },
  getNotifications: async () => {
    return ApiRequest('/inventory/notifications', { method: 'GET' });
  },
  markNotificationRead: async (id) => {
    return ApiRequest(`/inventory/notifications/${id}/read`, { method: 'PATCH' });
  },
  scanAlerts: async () => {
    return ApiRequest('/inventory/notifications/scan-alerts', { method: 'POST' });
  },

  getPharmacyMedicines: async () => {
    return ApiRequest('/inventory/medicines', { method: 'GET' });
  },
  getMedicineDetails: async (id) => {
    return ApiRequest(`/inventory/medicines/${id}`, { method: 'GET' });
  },
  getCatalogue: async (search = '') => {
    return ApiRequest(`/inventory/catalogue?search=${encodeURIComponent(search)}`, { method: 'GET' });
  },
  registerMedicine: async (medicineData) => {
    return ApiRequest('/inventory/medicines', {
      method: 'POST',
      body: JSON.stringify(medicineData),
    });
  },

  getBatches: async () => {
    return ApiRequest('/inventory/batches', { method: 'GET' });
  },
 receiveStock: async (pharmacyId, batchData) => {
  return ApiRequest(`/inventory/stock-in?pharmacyId=${String(pharmacyId)}`, {
    method: 'POST',
    body: JSON.stringify(batchData),
  });
},
  getBatchDetails: async (id) => {
    return ApiRequest(`/inventory/batches/${id}`, { method: 'GET' });
  },
  updateBatch: async (id, data) => {
    return ApiRequest(`/inventory/batches/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

 

  getTransactions: async () => {
    return ApiRequest('/inventory/transactions', { method: 'GET' });
  },
  getReports: async (format = 'JSON') => {
    return ApiRequest(`/inventory/reports?format=${format}`, { method: 'GET' });
  },
   updateMedicine: async (id, medicineData) => {
    return ApiRequest(`/inventory/medicines/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(medicineData),
    });
  },
  // Adjustments 
  adjustStock: async (pharmacyId, adjustmentData) => {
    return ApiRequest(`/inventory/adjustments?pharmacyId=${pharmacyId}`, {
      method: 'POST',
      body: JSON.stringify(adjustmentData),
    });
  },
};