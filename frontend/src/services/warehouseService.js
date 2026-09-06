import api from './api';

export const warehouseService = {
  getWarehouses: async (parentLocation) => {
    const query = parentLocation ? `?parentLocation=${parentLocation}` : '';
    const { data } = await api.get(`/warehouses${query}`);
    return data.data;
  },

  getWarehouse: async (id) => {
    const { data } = await api.get(`/warehouses/${id}`);
    return data.data;
  },

  createWarehouse: async (payload) => {
    const { data } = await api.post('/warehouses', payload);
    return data.data;
  },

  updateWarehouse: async (id, payload) => {
    const { data } = await api.put(`/warehouses/${id}`, payload);
    return data.data;
  },

  deleteWarehouse: async (id) => {
    const { data } = await api.delete(`/warehouses/${id}`);
    return data;
  },

  getStockAtWarehouse: async (warehouseId) => {
    const { data } = await api.get(`/warehouses/${warehouseId}/stock`);
    return data.data;
  },

  setStockAtLocation: async (warehouseId, categoryId, quantity) => {
    const { data } = await api.put(`/warehouses/${warehouseId}/stock/${categoryId}`, { quantity });
    return data.data;
  }
};
