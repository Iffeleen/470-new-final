import api from './api';

export const authService = {
  registerCompany: async (payload) => {
    const { data } = await api.post('/auth/register-company', payload);
    return data;
  },

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  },

  getMe: async () => {
    const { data } = await api.get('/auth/me');
    return data;
  },

  logout: () => {
    localStorage.removeItem('intrack_token');
    localStorage.removeItem('intrack_user');
  }
};
