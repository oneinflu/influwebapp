/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api, { storeToken, getStoredToken, clearToken } from '../utils/api';

type AuthType = 'admin' | 'user' | null;

interface AdminInfo {
  _id?: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}

interface UserInfo {
  _id?: string;
  registration?: { email?: string; isOwner?: boolean };
  profile?: { displayName?: string };
  [key: string]: unknown;
}

interface AuthContextValue {
  token: string | null;
  type: AuthType;
  admin: AdminInfo | null;
  user: UserInfo | null;
  loading: boolean;
  loginAdmin: (email: string, password: string, persistent?: boolean) => Promise<void>;
  loginUser: (email: string, password?: string, persistent?: boolean) => Promise<void>;
  registerUser: (
    name: string,
    country: string,
    email: string,
    phone: string,
    persistent?: boolean,
    primaryRole?: 'influencer' | 'model' | 'agency' | 'manager' | 'business'
  ) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [type, setType] = useState<AuthType>(null);
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    // Initialize from storage on mount
    const t = getStoredToken();
    if (t) {
      setToken(t);
      // Hydrate current user/admin from API so pages have identity
      (async () => {
        try {
          // Try user first
          const u = await api.get('/users/me').then(r => r.data).catch(() => null);
          if (u && u._id) {
            setType('user');
            setUser(u);
            setAdmin(null);
            return;
          }
          // Fallback: try admin
          const a = await api.get('/admins/me').then(r => r.data).catch(() => null);
          if (a && a._id) {
            setType('admin');
            setAdmin(a);
            setUser(null);
            return;
          }
        } catch {
          // ignore hydration failures; token stays set
        }
      })();
    }
  }, []);

  const loginAdmin = async (email: string, password: string, persistent: boolean = true) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/admin/login', { email, password });
      storeToken(data?.token, persistent);
      setToken(data?.token || null);
      setType('admin');
      setAdmin(data?.admin || null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

const loginUser = async (email: string, password?: string, persistent: boolean = true) => {
  setLoading(true);
  try {
      const payload: Record<string, unknown> = { email };
      if (password && password.trim()) payload.password = password.trim();
      const { data } = await api.post('/auth/user/login', payload);
      storeToken(data?.token, persistent);
      setToken(data?.token || null);
      setType('user');
      setUser(data?.user || null);
      setAdmin(null);
  } finally {
    setLoading(false);
  }
};

  const registerUser = async (
    name: string,
    country: string,
    email: string,
    phone: string,
    persistent: boolean = true,
    primaryRole?: 'influencer' | 'model' | 'agency' | 'manager' | 'business'
  ) => {
    setLoading(true);
    try {
      // First step registration: name, country, email, phone
      const payload = {
        registration: {
          email,
          phone,
          country,
          name,
          ...(primaryRole ? { roles: [primaryRole], primaryRole } : {}),
        },
        // Profile fields will be completed in the profile setup step; no displayName needed
      } as const;
      const { data } = await api.post('/users', payload);

      // If API returns token/user immediately, persist; else fallback to email login
      if (data?.token) {
        storeToken(data.token, persistent);
        setToken(data.token);
        setType('user');
        setUser(data?.user || null);
        setAdmin(null);
      } else {
        await loginUser(email, undefined, persistent);
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearToken();
    setToken(null);
    setType(null);
    setAdmin(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const u = await api.get('/users/me').then(r => r.data).catch(() => null);
      if (u && u._id) {
        setType('user');
        setUser(u);
        setAdmin(null);
        return;
      }
      const a = await api.get('/admins/me').then(r => r.data).catch(() => null);
      if (a && a._id) {
        setType('admin');
        setAdmin(a);
        setUser(null);
      }
    } catch {
      // swallow refresh errors
    }
  };

  const value = useMemo<AuthContextValue>(() => ({
    token, type, admin, user, loading,
    loginAdmin, loginUser, registerUser, logout, refreshUser,
  }), [token, type, admin, user, loading]);

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}