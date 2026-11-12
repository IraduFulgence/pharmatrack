import { ApiRequest } from "../config";
export interface Pharmacy {
  id: number;
  pharmacyName: string;
  pharmacy_name?: string; 
  phoneNumber: string;
  locationAddress: string;
  latitude: number;
  longitude: number;
  verificationStatus: string;
  verification_status?: string; 
}


export interface PharmacyListResponse {
  success: boolean;
  message: string;
  data: {
    pharmacies: Pharmacy[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const pharmacyService = {
  
  getAllPharmacies: async (): Promise<PharmacyListResponse> => {
    const response = await ApiRequest('/admin/pharmacies', { method: 'GET' });
    return response;
  }
};