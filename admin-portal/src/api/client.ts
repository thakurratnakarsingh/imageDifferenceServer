import axios from 'axios';
export const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || 'http://13.48.193.61:5000/api/v1' });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(response => response, error => {
  if (error.response?.status === 401 && !location.pathname.endsWith('/login')) {
    localStorage.removeItem('admin_token'); location.href = '/admin/login';
  }
  return Promise.reject(error);
});
