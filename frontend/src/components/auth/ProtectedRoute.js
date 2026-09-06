import React from 'react';
import { Navigate } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useTenant();

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
