import { ApiRequest } from "./auth";

const getPharmacyId = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.id || user?.pharmacyId;
  } catch { return null; }
};

export const salesService = {
  // Dashboard & History 
  getDashboardStats: async () => {
    const pharmacyId = getPharmacyId();
    return ApiRequest(`/sales/dashboard?pharmacyId=${pharmacyId}`, { method: 'GET' });
  },
  getSalesHistory: async (query = '') => {
    const pharmacyId = getPharmacyId();
    return ApiRequest(`/sales?pharmacyId=${pharmacyId}${query}`, { method: 'GET' });
  },

  // POS Search 
  searchMedicines: async (query) => {
    const pharmacyId = getPharmacyId();
    return ApiRequest(`/sales/pos/search-medicines?pharmacyId=${pharmacyId}&search=${encodeURIComponent(query)}`, { method: 'GET' });
  },
  searchPatients: async (query) => {
    return ApiRequest(`/sales/patients/search?search=${encodeURIComponent(query)}`, { method: 'GET' });
  },
  registerWalkIn: async (patientData) => {
    return ApiRequest('/sales/patients/register-walkin', {
      method: 'POST',
      body: JSON.stringify(patientData),
    });
  },
  getInsuranceProviders: async () => {
    return ApiRequest('/sales/insurance-providers', { method: 'GET' });
  },

  // Checkout 
  calculateBill: async (billData) => {
    return ApiRequest('/sales/calculate-bill', {
      method: 'POST',
      body: JSON.stringify(billData),
    });
  },
  createSale: async (saleData) => {
    return ApiRequest('/sales', {
      method: 'POST',
      body: JSON.stringify(saleData),
    });
  },

  // Receipt 
  getReceipt: async (saleId, format = 'JSON') => {
    return ApiRequest(`/sales/${saleId}/receipt?format=${format}`, { method: 'GET' });
  }
};