import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from './api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem('token'));

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (localStorage.getItem('token')) refresh();
  }, [refresh]);

  const signIn = (token, u) => {
    localStorage.setItem('token', token);
    setUser(u);
  };
  const signOut = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, signIn, signOut, refresh, setUser }}>{children}</AuthContext.Provider>;
}
