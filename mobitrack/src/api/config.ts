
import * as SecureStore from 'expo-secure-store';


export const API_BASE_URL = 'http://192.168.1.104:3000/api';

export const ApiRequest = async (
  endpoint: string, 
  options: RequestInit = {} 
) => {
  const token = await SecureStore.getItemAsync('token');
  
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    let errorMessage = data.message || 'Something went wrong';
    if (Array.isArray(data.message)) {
      errorMessage = data.message[0];
    }
    throw new Error(errorMessage);
  }

  return data;
};