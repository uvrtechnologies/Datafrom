import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : '');
if (!apiUrl) throw new Error('VITE_API_URL must be configured for a production build.');

const api = axios.create({
  baseURL: apiUrl,
});

export default api;
