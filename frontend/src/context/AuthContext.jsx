import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  getMe,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  setAuthToken,
} from "../services/api";

const AuthContext = createContext(null);
const TOKEN_KEY = "fraudguard_token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setAuthToken(null);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!token) {
        setAuthToken(null);
        setLoading(false);
        return;
      }

      setAuthToken(token);
      try {
        const data = await getMe();
        if (!cancelled) {
          setUser(data.user);
        }
      } catch {
        if (!cancelled) {
          clearSession();
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [token, clearSession]);

  const login = useCallback(async (email, password) => {
    const data = await apiLogin(email, password);
    localStorage.setItem(TOKEN_KEY, data.token);
    setAuthToken(data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (name, email, password, confirmPassword) => {
    const data = await apiRegister(name, email, password, confirmPassword);
    if (data.token) {
      localStorage.setItem(TOKEN_KEY, data.token);
      setAuthToken(data.token);
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      if (token) {
        await apiLogout();
      }
    } catch {
      // ignore logout network errors
    } finally {
      clearSession();
    }
  }, [token, clearSession]);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(user && token),
      isAdmin: user?.role === "ADMIN",
      isAnalyst: user?.role === "ANALYST" || user?.role === "ADMIN",
      login,
      register,
      logout,
    }),
    [user, token, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
