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
};