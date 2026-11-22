import { API_BASE_URL } from "../utils/api";

export const ApiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = { ...options.headers };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Safely handle non-JSON responses (like HTML error pages)
    let data;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = { message: await response.text() }; 
    }

    // if the response is not ok, throw a clean error
    if (!response.ok) {
      // Handle NestJS array of validation errors
      let errorMessage = 'Something went wrong';
      if (data.message) {
        errorMessage = Array.isArray(data.message) 
          ? data.message[0] 
          : data.message;
      }
      throw new Error(errorMessage);
    }

    return data;

  } catch (error) {
    // Catch network errors or JSON parse errors
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new Error('Cannot connect to the server. Please check your internet or backend.');
    }
    throw error;
  }
};
