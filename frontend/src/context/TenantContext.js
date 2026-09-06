import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const TenantContext = createContext(null);

/**
 * TenantProvider wraps the entire app. It holds the current user and their
 * company (tenant) context, hydrated from the JWT on load. No component
 * ever needs to "pick" a tenant — there is exactly one, resolved from
 * whoever is logged in, mirroring the backend's server-side resolution.
 */
export const TenantProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const hydrateSession = async () => {
    const token = localStorage.getItem('intrack_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await authService.getMe();
      setUser(res.data);
    } catch (err) {
      localStorage.removeItem('intrack_token');
      localStorage.removeItem('intrack_user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    hydrateSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const registerCompany = async (payload) => {
    setError(null);
    const res = await authService.registerCompany(payload);
    localStorage.setItem('intrack_token', res.token);
    setUser({
      id: res.data.user.id,
      firstName: res.data.user.firstName,
      lastName: res.data.user.lastName,
      email: res.data.user.email,
      role: res.data.user.role,
      tenantId: res.data.tenantId,
      companyName: res.data.companyName
    });
    return res;
  };

  const login = async (email, password) => {
    setError(null);
    const res = await authService.login(email, password);
    localStorage.setItem('intrack_token', res.token);
    setUser(res.data);
    return res;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const value = {
    user,
    tenantId: user?.tenantId || null,
    companyName: user?.companyName || null,
    isAuthenticated: !!user,
    loading,
    error,
    registerCompany,
    login,
    logout
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};

// Hook for consuming tenant/auth context anywhere in the app
export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
