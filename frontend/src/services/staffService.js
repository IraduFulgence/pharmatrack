import { ApiRequest } from "./auth";

const toQuery = (params = {})=>{
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value])=>{
        if(value !== '' && value !== null && value !== undefined && value !== 'ALL'){
            query.append(key, value);
        }
    });
    const str = query.toString();
    return str ? `?${str}` : '';
};

export const staffService = {
    // list staffs
    listStaff: async (filters= {}) => {
        return ApiRequest(`/pharmacy/staff${toQuery(filters)}`, {method: 'GET'});

    },
    // create staff
    createStaff: async (staffData) =>{
        return ApiRequest('/pharmacy/staff',{
            method:'POST',
            body: JSON.stringify(staffData),
        });
    },
    // get single staff
    getStaff: async (id) => {
    return ApiRequest(`/pharmacy/staff/${id}`, { method: 'GET' });
  },
  updateStaff: async (id, staffData) => {
    return ApiRequest(`/pharmacy/staff/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(staffData),
    });
  },

  toggleStatus: async (id) => {
    return ApiRequest(`/pharmacy/staff/${id}/toggle-status`, { method: 'PATCH' });
  },

  reissueCode: async (id) => {
    return ApiRequest(`/pharmacy/staff/${id}/reissue-code`, { method: 'POST' });
  },

  getStaffActivity: async (id, filters = {}) => {
    return ApiRequest(`/pharmacy/staff/${id}/activity${toQuery(filters)}`, { method: 'GET' });
  },

  getStaffSalesReport: async (filters = {}) => {
    return ApiRequest(`/pharmacy/reports/staff-sales${toQuery(filters)}`, { method: 'GET' });
  },
   activateAccount: async ({ identifier, activationCode, password, confirmPassword }) => {
    return ApiRequest('/staff/activate', {
      method: 'POST',
      body: JSON.stringify({ identifier, activationCode, password, confirmPassword }),
    });
  },
};