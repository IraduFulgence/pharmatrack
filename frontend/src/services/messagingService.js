import { ApiRequest } from "./auth";

export const messagingService = {
  getConversations: async () => {
    return ApiRequest('/pharmacy/messages/conversations', { method: 'GET' });
  },

  getMessages: async (chatId) => {
    return ApiRequest(`/pharmacy/messages/conversations/${chatId}`, { method: 'GET' });
  },

  sendMessage: async (chatId, message) => {
    return ApiRequest(`/pharmacy/messages/conversations/${chatId}`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },
};
