import { ApiRequest } from "./auth";

const getPharmacyId = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.id || user?.pharmacyId;
  } catch { return null; }
};
export const inventoryService = {
  getDashboard: async () => {
    return ApiRequest('/inventory/dashboard', { method: 'GET' });
  },
   getAlerts: async () => {
    const pharmacyId = getPharmacyId();
    return ApiRequest(`/inventory/alerts?pharmacyId=${pharmacyId}`, { method: 'GET' });
  },
    getNotifications: async () => {
    const pharmacyId = getPharmacyId();
    return ApiRequest(`/inventory/notifications?pharmacyId=${pharmacyId}`, { method: 'GET' });
  },

  scanAlerts: async () => {
    const pharmacyId = getPharmacyId();
    return ApiRequest(`/inventory/notifications/scan-alerts?pharmacyId=${pharmacyId}`, { method: 'POST' });
  },
  
  markNotificationRead: async (id) => {
    const pharmacyId = getPharmacyId();
    return ApiRequest(`/inventory/notifications/${id}/read?pharmacyId=${pharmacyId}`, { method: 'PATCH' });
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

  getTransactions: async (queryParams) => {
    const params = new URLSearchParams();
    
    if (queryParams.transactionType) params.append('transactionType', queryParams.transactionType);
    if (queryParams.startDate) params.append('startDate', queryParams.startDate);
    if (queryParams.endDate) params.append('endDate', queryParams.endDate);
    if (queryParams.page) params.append('page', queryParams.page);
    if (queryParams.limit) params.append('limit', queryParams.limit);

    const pharmacyId = JSON.parse(localStorage.getItem('user'))?.id;
    if (pharmacyId) params.append('pharmacyId', pharmacyId);

    return ApiRequest(`/inventory/transactions?${params.toString()}`, { method: 'GET' });
  },
};