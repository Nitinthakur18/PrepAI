import { createContext, useContext, useEffect, useState } from "react";
import * as authService from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("prepai_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("prepai_token");

    if (!token) {
      setInitializing(false);
      return;
    }

    authService
      .getMe()
      .then((res) => {
        setUser(res.data.user);
        localStorage.setItem("prepai_user", JSON.stringify(res.data.user));
      })
      .catch(() => {
        localStorage.removeItem("prepai_token");
        localStorage.removeItem("prepai_user");
        setUser(null);
      })
      .finally(() => setInitializing(false));
  }, []);

  const login = async (email, password) => {
    const res = await authService.login({ email, password });
    localStorage.setItem("prepai_token", res.data.token);
    localStorage.setItem("prepai_user", JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (name, email, password) => {
    const res = await authService.register({ name, email, password });
    localStorage.setItem("prepai_token", res.data.token);
    localStorage.setItem("prepai_user", JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem("prepai_user", JSON.stringify(updatedUser));
  };

  const logout = () => {
    localStorage.removeItem("prepai_token");
    localStorage.removeItem("prepai_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, login, register, logout, updateUser, initializing }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
