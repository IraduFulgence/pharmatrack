import {ApiRequest} from './auth';

export const adminService ={
    // get admin stats
  getDashboardStats: async () => {
    return ApiRequest('/admin/dashboard/stats', { method: 'GET' });
  },
    // get all admins
    getAllAdmins: async () =>{
        return ApiRequest('/admin/administrators',{method:'GET'});
    },

    // create new admin
    createAdmin: async (adminData) =>{
        return ApiRequest('/admin/administrators',{
            method:'POST',
            body: JSON.stringify(adminData)
        });
    },
    // get all pharmacies
    getAllPharmacies: async () =>{
    return ApiRequest('/admin/pharmacies',{method:'GET'});      
    },
    // get single pharmacy
    getPharmacyById: async (id) => {
    return ApiRequest(`/admin/pharmacies/${id}`, { method: 'GET' });
  },
  // Approve a pharmacy
  approvePharmacy: async (id) => {
    return ApiRequest(`/admin/pharmacies/${id}/approve`, { method: 'PATCH' });
  },

  // Reject a pharmacy with a reason
  rejectPharmacy: async (id, reason) => {
    return ApiRequest(`/admin/pharmacies/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  },
  getPharmacyDocument: async (id, type) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/admin/pharmacies/${id}/certificate/${type}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to load document. It may not exist or you are unauthorized.');
    }

    // Return the raw binary data as a Blob
    return response.blob();
  },
  // patients end points
  getAllPatients: async () =>{
  return ApiRequest('/admin/patients',{method:'GET'});  
  },
  getPatientById: async (id) => {
    return ApiRequest(`/admin/patients/${id}`, { method: 'GET' });
  },
    updatePatient: async (id, patientData) => {
    return ApiRequest(`/admin/patients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patientData),
    });
  },

  // Toggle patient active/inactive status
  togglePatientStatus: async (id) => {
    return ApiRequest(`/admin/patients/${id}/toggle-status`, {
      method: 'PATCH',
    });
  },


};