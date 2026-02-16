import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

// Types
interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  oauth_provider?: string;
  is_active: boolean;
  created_at: string;
}

interface ParentProfile {
  id: string;
  name: string;
  has_pin: boolean;
  associated_kids: string[];
}

interface Kid {
  id: string;
  name: string;
  points: number;
}

interface AuthState {
  user: User | null;
  parent: ParentProfile | null;
  kids: Kid[];
  activeKidId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: 'parent' | 'kid';
  kidId: string | null;  // kid_id from JWT for kid sessions
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  loginWithGoogle: (code: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  setActiveKid: (kidId: string | null) => void;
  verifyPin: (pin: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Token storage helpers
const TOKEN_KEY = 'kc_access_token';
const REFRESH_TOKEN_KEY = 'kc_refresh_token';
const ACTIVE_KID_KEY = 'kc_active_kid';

function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function storeTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ACTIVE_KID_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    parent: null,
    kids: [],
    activeKidId: localStorage.getItem(ACTIVE_KID_KEY),
    isLoading: true,
    isAuthenticated: false,
    role: 'parent',
    kidId: null,
  });

  // Set up axios interceptor for auth header
  useEffect(() => {
    const requestInterceptor = api.interceptors.request.use((config) => {
      const token = getStoredToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    const responseInterceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If 401 and we haven't tried refreshing yet
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          const refreshed = await refreshToken();
          if (refreshed) {
            // Retry original request with new token
            const token = getStoredToken();
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.request.eject(requestInterceptor);
      api.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = getStoredToken();
    if (!token) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const response = await api.get('/auth/me');
      const { user, parent, kids, role, kid_id } = response.data;
      const isKid = role === 'kid';
      setState({
        user,
        parent,
        kids,
        activeKidId: isKid ? kid_id : localStorage.getItem(ACTIVE_KID_KEY),
        isLoading: false,
        isAuthenticated: true,
        role: role || 'parent',
        kidId: kid_id || null,
      });
    } catch {
      // Token invalid or expired, try refresh
      const refreshed = await refreshToken();
      if (!refreshed) {
        clearTokens();
        setState({
          user: null,
          parent: null,
          kids: [],
          activeKidId: null,
          isLoading: false,
          isAuthenticated: false,
          role: 'parent',
          kidId: null,
        });
      }
    }
  };

  const refreshToken = useCallback(async (): Promise<boolean> => {
    const refreshTokenValue = getStoredRefreshToken();
    if (!refreshTokenValue) return false;

    try {
      const response = await api.post('/auth/refresh', {
        refresh_token: refreshTokenValue,
      });
      const { access_token, refresh_token } = response.data;
      storeTokens(access_token, refresh_token);

      // Reload user info
      const meResponse = await api.get('/auth/me');
      const { user, parent, kids, role, kid_id } = meResponse.data;
      const isKid = role === 'kid';
      setState({
        user,
        parent,
        kids,
        activeKidId: isKid ? kid_id : localStorage.getItem(ACTIVE_KID_KEY),
        isLoading: false,
        isAuthenticated: true,
        role: role || 'parent',
        kidId: kid_id || null,
      });

      return true;
    } catch {
      clearTokens();
      setState({
        user: null,
        parent: null,
        kids: [],
        activeKidId: null,
        isLoading: false,
        isAuthenticated: false,
        role: 'parent',
        kidId: null,
      });
      return false;
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    const { access_token, refresh_token } = response.data;
    storeTokens(access_token, refresh_token);
    await checkAuth();
  };

  const register = async (email: string, password: string, displayName: string) => {
    const response = await api.post('/auth/register', {
      email,
      password,
      display_name: displayName,
    });
    const { access_token, refresh_token } = response.data;
    storeTokens(access_token, refresh_token);
    await checkAuth();
  };

  const loginWithGoogle = async (code: string) => {
    const response = await api.post('/auth/google', { code });
    const { access_token, refresh_token } = response.data;
    storeTokens(access_token, refresh_token);
    await checkAuth();
  };

  const logout = () => {
    clearTokens();
    setState({
      user: null,
      parent: null,
      kids: [],
      activeKidId: null,
      isLoading: false,
      isAuthenticated: false,
      role: 'parent',
      kidId: null,
    });
  };

  const setActiveKid = (kidId: string | null) => {
    if (kidId) {
      localStorage.setItem(ACTIVE_KID_KEY, kidId);
    } else {
      localStorage.removeItem(ACTIVE_KID_KEY);
    }
    setState((prev) => ({ ...prev, activeKidId: kidId }));
  };

  const verifyPin = async (pin: string): Promise<boolean> => {
    if (!state.parent) return false;

    try {
      await api.post('/auth/verify-pin', {
        parent_id: state.parent.id,
        pin,
      });
      return true;
    } catch {
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        loginWithGoogle,
        logout,
        refreshToken,
        setActiveKid,
        verifyPin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Export types for use elsewhere
export type { User, ParentProfile, Kid, AuthContextType };
