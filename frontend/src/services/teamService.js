import api from './api';

export const teamService = {
  getTeamMembers: async () => {
    const { data } = await api.get('/team');
    return data.data;
  },

  updateMemberRole: async (userId, roleId) => {
    const { data } = await api.put(`/team/${userId}/role`, { roleId });
    return data.data;
  },

  removeMember: async (userId) => {
    const { data } = await api.delete(`/team/${userId}`);
    return data;
  }
};

export const invitationService = {
  getInvitations: async () => {
    const { data } = await api.get('/invitations');
    return data.data;
  },

  createInvitation: async (email, roleId) => {
    const { data } = await api.post('/invitations', { email, roleId });
    return data.data;
  },

  revokeInvitation: async (id) => {
    const { data } = await api.delete(`/invitations/${id}`);
    return data;
  },

  // Public — no auth token needed
  verifyInvitation: async (token) => {
    const { data } = await api.get(`/invitations/verify/${token}`);
    return data.data;
  },

  acceptInvitation: async (token, payload) => {
    const { data } = await api.post(`/invitations/accept/${token}`, payload);
    return data;
  }
};
