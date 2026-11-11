import { ApiRequest } from "./auth";

export const authService = {

  // Standard Login
  login: async (identifier, password) => {
    return ApiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
  },
 getProfile: async () => {
    return ApiRequest('/auth/profile', { method: 'GET' });
  },
  //  Register Patient
  registerPatient: async (patientData) => {
    return ApiRequest('/auth/register/patient', {
      method: 'POST',
      body: JSON.stringify(patientData),
    });
  },

  // Register Pharmacy 
  registerPharmacy: async (formData) => {
    
    return ApiRequest('/auth/register/pharmacy', {
      method: 'POST',
      body: formData,
    });
  },
  getMyDocument: async (type) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/auth/profile/documents/${type}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    //console.log('documents',response);

    if (!response.ok) {
      throw new Error('Failed to load document.');

    }
    return response.blob();
  }
 
};