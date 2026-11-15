import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = ({ allowedRoles, requireApprovedPharmacy = false }) => {
  // Get user data from localStorage
  const token = localStorage.getItem('token');
  const userString = localStorage.getItem('user');
  
  // If no token or no user data, force login
  if (!token || !userString) {
    return <Navigate to="/login" replace />;
  }

  let user;
  try {
    user = JSON.parse(userString);
  } catch (e) {
    // If the data is corrupted, clear it and force login
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return <Navigate to="/login" replace />;
  }

  // Check if the user's role is allowed
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If they are logged in but wrong role, send them to their correct dashboard
    if (user.role === 'PHARMACY') return <Navigate to="/pharmacy/dashboard" replace />;
    if (user.role === 'PATIENT') return <Navigate to="/patient-dashboard" replace />; // Adjust based on your routes
    return <Navigate to="/login" replace />;
  }

  // Check specific Pharmacy Approval Status
  if (requireApprovedPharmacy && user.role === 'PHARMACY') {
    if (user.verificationStatus !== 'APPROVED') {
      // Send them to a "Pending Verification" page
      return <Navigate to="/pending-verification" replace />;
    }
  }

  //If they pass all checks, render the child routes
  return <Outlet />;
};

export default ProtectedRoute;