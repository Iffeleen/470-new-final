import api from './api';

export const roleService = {
  getPermissionCatalog: async () => {
    const { data } = await api.get('/roles/permissions');
    return data.data; // { permissions: [...], templates: {...} }
  },

  getRoles: async () => {
    const { data } = await api.get('/roles');
    return data.data;
  },

  createRole: async (payload) => {
    const { data } = await api.post('/roles', payload);
    return data.data;
  },

  updateRole: async (id, payload) => {
    const { data } = await api.put(`/roles/${id}`, payload);
    return data.data;
  },

  deleteRole: async (id) => {
    const { data } = await api.delete(`/roles/${id}`);
    return data;
  }
};
