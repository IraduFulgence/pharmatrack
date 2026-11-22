import { ApiRequest } from "./auth";

export const authService = {
  
  login: async (identifier, password) => {
    
    const response = await ApiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });

   
    if (!response || !response.data || !response.data.token) {
      throw new Error(response?.message || 'Invalid credentials');
    }

    
    return response;
  },

  getProfile: async () => {
    return ApiRequest('/auth/profile', { method: 'GET' });
  },

  registerPatient: async (patientData) => {
    return ApiRequest('/auth/register/patient', {
      method: 'POST',
      body: JSON.stringify(patientData),
    });
  },

  registerPharmacy: async (formData) => {
    return ApiRequest('/auth/register/pharmacy', {
      method: 'POST',
      body: formData,
    });
  },

  getMyDocument: async (type) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://pharmatrack-backend-thxw.onrender.com/api'}/auth/profile/documents/${type}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error('Failed to load document.');
    }
    
    return response.blob();
  }
};