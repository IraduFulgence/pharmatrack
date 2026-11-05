import { API_BASE_URL } from "../utils/api";

// helper to handle fetch requests
export const ApiRequest = async (endpoint, options = {}) =>{
    const token = localStorage.getItem('token');

    const headers ={
        ...options.headers,
    };

    // if not formdata, we send JSON

    if(!(options.body instanceof FormData)){
        headers['Content-Type'] = 'application/json';
    }

    if(token){
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`,{
        ...options,
        headers,
    });
    const data = await response.json();
      if (!response.ok) {
    // NestJS usually returns errors in data.message or data.errors
    console.error("Backend Error Details:", data); 
    const errorMessage = data.message || 'Something went wrong';
    
    // If it's a validation error array
    if (data.message && Array.isArray(data.message)) {
      throw new Error(data.message[0]);
    }
    
    throw new Error(errorMessage);
  }
  return data;
}