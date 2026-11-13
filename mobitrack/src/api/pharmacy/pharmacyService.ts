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


export interface NearbyPharmacyResponse {
  success: boolean;
  message: string;
  data: {
    pharmacies: Pharmacy[];
    
  };
}

export const pharmacyService = {
  
  getNearbyPharmacies: async (latitude: number, longitude: number): Promise<NearbyPharmacyResponse> => {
    return ApiRequest(
      `/patients/pharmacies/nearby?latitude=${latitude}&longitude=${longitude}`,
      { method: 'GET' }
    );
  },

  searchMedicine: async (name: string) => {
    return ApiRequest(`/patients/medicines/search?name=${encodeURIComponent(name)}`, {
      method: 'GET',
    });
  },


  
};