import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL === undefined ? 'http://localhost:8000' : import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if it's expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // We can't easily import useAuthStore here due to circular deps or outside React,
      // but clearing localStorage will log them out on next load. 
      // Ideally, we'd trigger a reload or event.
      window.dispatchEvent(new Event('auth-error'));
    }
    return Promise.reject(error);
  }
);
export default api;
