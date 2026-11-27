import { ApiRequest } from "../config";

export type ChatStatus = 'OPEN' | 'CLOSED' | string;

export interface ChatSummary {
  chat_id: number;
  pharmacy_id: number;
  pharmacy_name: string;
  phone_number?: string | null;
  status?: ChatStatus;
  created_at: string;
  updated_at: string;
  last_message: string | null;
  last_sender_role: 'PATIENT' | 'PHARMACY' | null;
  last_message_at: string | null;
}

export interface ChatMessage {
  message_id: number;
  chat_id: number;
  sender_user_id: number;
  sender_role: 'PATIENT' | 'PHARMACY';
  sender_email?: string | null;
  sender_name?: string | null;
  message: string;
  created_at: string;
  edited_at: string | null;
}

export interface ChatConversation {
  chat_id: number;
  status?: ChatStatus;
  pharmacy_id: number;
  pharmacy_name: string;
  phone_number?: string | null;
}

export const chatService = {
  // Opens  the conversation with a pharmacy and returns its chat_id.
  startChat: async (pharmacyId: number): Promise<{ data: ChatSummary }> => {
    return ApiRequest('/patients/chats', {
      method: 'POST',
      body: JSON.stringify({ pharmacyId }),
    });
  },

  getChats: async (): Promise<{ data: ChatSummary[] }> => {
    return ApiRequest('/patients/chats', { method: 'GET' });
  },

  getMessages: async (
    chatId: number | string,
  ): Promise<{ data: ChatMessage[]; conversation?: ChatConversation }> => {
    return ApiRequest(`/patients/chats/${chatId}/messages`, { method: 'GET' });
  },

  sendMessage: async (chatId: number | string, message: string): Promise<{ data: ChatMessage }> => {
    return ApiRequest(`/patients/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },
};

export const formatChatTime = (value?: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const t = date.getTime();
  if (t >= startOfToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (t >= startOfToday - dayMs) return 'Yesterday';
  if (t >= startOfToday - 6 * dayMs) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString();
};
