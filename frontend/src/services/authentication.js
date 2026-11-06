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

  // Get Profile 
  getProfile: async () => {
    return ApiRequest('/auth/profile', { method: 'GET' });
  }
};