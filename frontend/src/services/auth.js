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

    let data;
    const contentType = response.headers.get('content-type');
    
    // Parse JSON if possible, otherwise fallback to text
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // If it's an HTML 500 error page, don't show the whole HTML string to the user
      const text = await response.text();
      data = { message: response.ok ? text : 'Server error. Please check the backend logs.' };
    }

    if (!response.ok) {
      let errorMessage = 'Something went wrong';
      
      if (data.message) {
        errorMessage = Array.isArray(data.message) 
          ? data.message[0] 
          : data.message;
      }
      
      // If the backend returns a generic 500 HTML page, override the message
      if (response.status === 500) {
        errorMessage = 'Internal Server Error. The backend crashed while loading conversations.';
      }

      throw new Error(errorMessage);
    }

    return data;

  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new Error('Cannot connect to the server. Is your backend running?');
    }
    throw error;
  }
};