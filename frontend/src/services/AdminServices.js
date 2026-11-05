import {ApiRequest} from './auth';

export const adminService ={

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

  // Reject a pharmacy (requires reason)
  rejectPharmacy: async (id, reason) => {
    return ApiRequest(`/admin/pharmacies/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  },

};