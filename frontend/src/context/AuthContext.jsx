import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [consumer, setConsumer] = useState(null);
  const [loading, setLoading] = useState(true);

  // On page refresh, restore the session from the stored token
  useEffect(() => {
    const token = localStorage.getItem('gl_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((res) => {
        setUser(res.data.user);
        setConsumer(res.data.consumer);
      })
      .catch(() => localStorage.removeItem('gl_token'))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('gl_token', res.data.token);
    setUser(res.data.user);
    setConsumer(res.data.consumer);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem('gl_token');
    setUser(null);
    setConsumer(null);
  };

  return <AuthContext.Provider value={{ user, consumer, loading, login, logout }}>{children}</AuthContext.Provider>;
}
