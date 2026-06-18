/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { loginRequest } from "../services/auth.api";

export type WorkspaceType = "PERSONAL" | "BUSINESS";

export interface User {
  id: string;
  name: string;
  lastName?: string;
  email: string;
  profiles: WorkspaceType[];
  [key: string]: any;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: any) => Promise<boolean>;
  logout: () => void;
  activeWorkspace: WorkspaceType | null;
  setActiveWorkspace: (workspace: WorkspaceType | null) => void;
  userProfiles: WorkspaceType[];
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // 🔐 token global
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token"),
  );
  const [user, setUser] = useState<User | null>(
    JSON.parse(localStorage.getItem("user") || "null"),
  );

  // Workspace Selection
  const [activeWorkspace, setActiveWorkspaceState] =
    useState<WorkspaceType | null>(
      (localStorage.getItem("activeWorkspace") as WorkspaceType) || null,
    );

  const setActiveWorkspace = (workspace: WorkspaceType | null) => {
    if (workspace) {
      localStorage.setItem("activeWorkspace", workspace);
    } else {
      localStorage.removeItem("activeWorkspace");
    }
    setActiveWorkspaceState(workspace);
  };

  // Simulated profiles (in case backend doesn't send it yet, we default to both for testing)
  // In production, this would be: user?.profiles || ["PERSONAL"]
  const userProfiles: WorkspaceType[] = user?.profiles || [
    "PERSONAL",
    "BUSINESS",
  ];

  /**
   * 🔐 LOGIN REAL
   * Devuelve true si fue correcto
   */
  const login = async (email: string, password: string) => {
    try {
      const data = await loginRequest(email, password);

      // 🚨 SOLO si hay token guardamos
      if (!data.access_token) throw new Error();

      localStorage.setItem("token", data.access_token);

      // Asignar perfiles por defecto si no vienen
      const loggedUser = {
        ...data.user,
        profiles: data.user.profiles || ["PERSONAL", "BUSINESS"], // Default for demo
      };

      localStorage.setItem("user", JSON.stringify(loggedUser));

      const userProfs = loggedUser.profiles;
      // Si solo tiene un perfil, setearlo como activo
      if (userProfs.length === 1) {
        setActiveWorkspace(userProfs[0]);
      } else {
        setActiveWorkspace(null); // Force selection
      }

      setToken(data.access_token);
      setUser(loggedUser);

      return true; // 👈 LOGIN OK
    } catch (_error) {
      return false; // 👈 LOGIN FAIL
    }
  };

  /**
   * 📝 REGISTRO REAL
   */
  const register = async (registerData: any) => {
    try {
      // Import dynamic or use global, assuming registerRequest is in auth.api.ts
      const { registerRequest } = await import("../services/auth.api");
      const data = await registerRequest(registerData);

      if (!data.access_token) throw new Error();

      localStorage.setItem("token", data.access_token);

      const loggedUser = {
        ...data.user,
        profiles: data.user.profiles || registerData.profiles || ["PERSONAL"],
      };

      localStorage.setItem("user", JSON.stringify(loggedUser));

      const userProfs = loggedUser.profiles;
      if (userProfs.length === 1) {
        setActiveWorkspace(userProfs[0]);
      } else {
        setActiveWorkspace(null);
      }

      setToken(data.access_token);
      setUser(loggedUser);

      return true;
    } catch (_error) {
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("activeWorkspace");
    setToken(null);
    setUser(null);
    setActiveWorkspace(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        login,
        register,
        logout,
        user,
        setUser,
        activeWorkspace,
        setActiveWorkspace,
        userProfiles,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth fuera de provider");
  return ctx;
};
