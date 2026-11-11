import { ApiRequest } from "../config";
import * as SecureStore from 'expo-secure-store';

export interface PatientRegisterData{
 fullName: string;
  dateOfBirth: string;
  phoneNumber: string;
  gender: 'Male' | 'Female' | 'Other';
  email?: string;
  password?: string;
}

export interface LoginResponse {
    success:boolean;
    message: string;
    data:{
        token: string;
        user:{
            id: number;
            fullName: string;
            email: string;
            phoneNumber: string;
            role: 'PATIENT' | 'PHARMACY' | 'ADMIN';
        };
        redirectTo: string;
    };
}



export const AuthService = {
    registerPatient: async (patientData: PatientRegisterData) => {
        return ApiRequest('/auth/register/patient',{
            method:'POST',
            body: JSON.stringify(patientData),
        });
    },
    // login function
    login: async (identifier:string, password:string):Promise<LoginResponse> => {
    const response = await ApiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    if (response.data?.token) {
      await SecureStore.setItemAsync('token', response.data.token);
      await SecureStore.setItemAsync('user', JSON.stringify(response.data.user));
    }

    return response;
  },
   // Helper to get the current user from storage
  getUser: async () => {
    const userString = await SecureStore.getItemAsync('user');
    return userString ? JSON.parse(userString) : null;
  },

  // Helper to log out
  logout: async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
  }
};