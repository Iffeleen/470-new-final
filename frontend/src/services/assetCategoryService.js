import api from './api';

export const assetCategoryService = {
  getCategories: async () => {
    const { data } = await api.get('/asset-categories');
    return data.data;
  },

  getCategory: async (id) => {
    const { data } = await api.get(`/asset-categories/${id}`);
    return data.data;
  },

  createCategory: async (payload) => {
    const { data } = await api.post('/asset-categories', payload);
    return data.data;
  },

  updateCategory: async (id, payload) => {
    const { data } = await api.put(`/asset-categories/${id}`, payload);
    return data.data;
  },

  deleteCategory: async (id) => {
    const { data } = await api.delete(`/asset-categories/${id}`);
    return data;
  },

  getStockForCategory: async (id) => {
    const { data } = await api.get(`/asset-categories/${id}/stock`);
    return data; // { count, totalQuantity, data: [...] }
  }
};
