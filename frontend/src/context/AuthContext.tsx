import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User, Role } from '../types';
import { api } from '../lib/api';

// ── Dev Role Switcher credentials ─────────────────────────
export const ROLE_CREDENTIALS: Record<Role, { email: string; password: string; label: string }> = {
  ADMIN: { email: 'admin@company.com', password: 'password123', label: 'Admin User' },
  SALES: { email: 'sales@company.com', password: 'password123', label: 'Sales Rep' },
  WAREHOUSE: { email: 'warehouse@company.com', password: 'password123', label: 'Warehouse Manager' },
  ACCOUNTS: { email: 'accounts@company.com', password: 'password123', label: 'Accounts Executive' },
};

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('crm_token');
    if (storedToken) {
      setToken(storedToken);
      api.auth.me()
        .then(res => setUser(res.data))
        .catch(() => { localStorage.removeItem('crm_token'); })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.auth.login(email, password);
    localStorage.setItem('crm_token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
  };

  const logout = () => {
    localStorage.removeItem('crm_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
