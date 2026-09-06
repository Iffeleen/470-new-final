import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Attaches the JWT to every outgoing request. The token is the ONLY thing
// that identifies which tenant a request belongs to — the frontend never
// sends a tenantId directly, so there's nothing for a user to tamper with.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('intrack_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global response handler: on 401 (expired/invalid token), clear session
// and force a re-login rather than letting the app sit in a broken state.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('intrack_token');
      localStorage.removeItem('intrack_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
