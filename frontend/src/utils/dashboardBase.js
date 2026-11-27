import { useLocation } from 'react-router-dom';

export const STAFF_ROLES = ['SALES_OFFICER','PHARMACIST'];
export const STAFF_DASHBOARD = '/staff/dashboard';
export const PHARMACY_DASHBOARD = '/pharmacy/dashboard';

export const useDashboardBase = () => {
  const { pathname } = useLocation();
  return pathname.startsWith(STAFF_DASHBOARD) ? STAFF_DASHBOARD : PHARMACY_DASHBOARD;
};
