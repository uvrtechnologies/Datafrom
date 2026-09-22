import { useState, useCallback } from 'react';
import api from '../services/api';

export default function useAuth() {
  const [admin, setAdmin] = useState(() => {
    const raw = localStorage.getItem('admin_info');
    return raw ? JSON.parse(raw) : null;
  });

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/admin/login', { email, password });
    localStorage.setItem('admin_token', data.token);
    localStorage.setItem('admin_info', JSON.stringify(data.admin));
    setAdmin(data.admin);
    return data.admin;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_info');
    setAdmin(null);
  }, []);

  const isAuthenticated = !!localStorage.getItem('admin_token');

  return { admin, login, logout, isAuthenticated };
}
