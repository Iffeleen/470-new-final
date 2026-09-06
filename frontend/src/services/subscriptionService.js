import api from './api';

export const subscriptionService = {
  getTiers: async () => {
    const { data } = await api.get('/subscription/tiers');
    return data.data;
  },

  getUsage: async () => {
    const { data } = await api.get('/subscription/usage');
    return data.data;
  },

  changeTier: async (tierName) => {
    const { data } = await api.put('/subscription/upgrade', { tierName });
    return data.data;
  }
};
