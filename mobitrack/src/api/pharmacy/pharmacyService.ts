import { ApiRequest } from "../config";
export interface Pharmacy {
  id: number;
  pharmacyName: string;
  phoneNumber: string;
  locationAddress: string;
  latitude: number;
  longitude: number;
  verificationStatus: string;
}

export const pharmacyService = {
  getAllPharmacies: async (): Promise<{ data: Pharmacy[] }> => {
    const response = await ApiRequest('/admin/pharmacies?limit=50', { method: 'GET' });
    return response;
  }
};