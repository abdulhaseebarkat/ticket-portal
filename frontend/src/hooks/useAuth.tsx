import { createContext, useContext, useState, type ReactNode } from 'react';
import { login as loginRequest, getStoredToken, getStoredEmail, setStoredAuth, clearStoredAuth } from '../lib/api';

interface AuthContextValue {
  email: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [email, setEmail] = useState<string | null>(() => getStoredEmail());

  const login = async (loginEmail: string, password: string) => {
    try {
      const response = await loginRequest(loginEmail, password);
      setStoredAuth(response.token, response.email);
      setToken(response.token);
      setEmail(response.email);
      return { success: true };
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Invalid email or password.';
      return { success: false, message };
    }
  };

  const logout = () => {
    clearStoredAuth();
    setToken(null);
    setEmail(null);
  };

  return (
    <AuthContext.Provider value={{ email, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
