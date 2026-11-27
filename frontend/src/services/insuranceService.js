import { ApiRequest } from "./auth";

// The backend only lets a pharmacy account touch its own pharmacy; this just
// fills in the pharmacyId the URL needs.
const getPharmacyId = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user')) || {};
    return user.pharmacyId || user.id;
  } catch {
    return undefined;
  }
};

const base = () => `/pharmacy/${getPharmacyId()}/insurances`;

export const insuranceService = {
  // Insurers this pharmacy has set up (accepted or switched off), with coverage %.
  list: async () => ApiRequest(base(), { method: 'GET' }),

 
  available: async () => ApiRequest(`${base()}/available`, { method: 'GET' }),

  add: async ({ insuranceId, coveragePercentage }) =>
    ApiRequest(base(), {
      method: 'POST',
      body: JSON.stringify({ insuranceId, coveragePercentage }),
    }),

  
  update: async (id, changes) =>
    ApiRequest(`${base()}/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(changes),
    }),
};
