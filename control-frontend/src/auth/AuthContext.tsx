/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { loginRequest } from "../services/auth.api";

export type WorkspaceType = "PERSONAL" | "BUSINESS";

export interface User {
  id: string;
  name: string;
  lastName?: string;
  email: string;
  role?: string;
  profiles: WorkspaceType[];
  blockedProfiles?: WorkspaceType[];
  [key: string]: any;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: any) => Promise<{ success: boolean; activationRequired?: boolean; alreadyExists?: boolean; error?: string }>;
  logout: () => void;
  activeWorkspace: WorkspaceType | null;
  setActiveWorkspace: (workspace: WorkspaceType | null) => void;
  userProfiles: WorkspaceType[];
}

const AuthContext = createContext<AuthContextType | null>(null);

/** Safely parse profiles — handles string JSON, array, or null */
const parseProfiles = (raw: any): WorkspaceType[] => {
  if (!raw) return ["PERSONAL"];
  if (Array.isArray(raw)) return raw as WorkspaceType[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as WorkspaceType[];
    } catch { /* ignore */ }
  }
  return ["PERSONAL"];
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
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

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("activeWorkspace");
    setToken(null);
    setUser(null);
    setActiveWorkspaceState(null);
  };

  const userProfiles: WorkspaceType[] = parseProfiles(user?.profiles);

  // Sync user profile with backend on mount/token change
  useEffect(() => {
    if (!token) return;

    const syncProfile = async () => {
      try {
        const { getUserRequest } = await import("../services/user.api");
        const freshUser = await getUserRequest();

        if (freshUser.isActive === false) {
          logout();
          return;
        }

        const loggedUser: User = {
          ...freshUser,
          profiles: parseProfiles(freshUser.profiles),
          blockedProfiles: freshUser.blockedProfiles ? parseProfiles(freshUser.blockedProfiles) : [],
        };

        localStorage.setItem("user", JSON.stringify(loggedUser));
        setUser(loggedUser);

        const userProfs = loggedUser.profiles;
        if (userProfs.length === 1) {
          setActiveWorkspace(userProfs[0]);
        } else if (activeWorkspace && !userProfs.includes(activeWorkspace)) {
          setActiveWorkspaceState(null);
          localStorage.removeItem("activeWorkspace");
        }
      } catch (error) {
        console.error("Error syncing profile with backend:", error);
      }
    };

    syncProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /**
   * 🔐 LOGIN
   */
  const login = async (email: string, password: string) => {
    try {
      const data = await loginRequest(email, password);

      if (!data.access_token) throw new Error("Token no recibido");

      localStorage.setItem("token", data.access_token);

      const loggedUser: User = {
        ...data.user,
        profiles: parseProfiles(data.user?.profiles),
        blockedProfiles: data.user?.blockedProfiles ? parseProfiles(data.user.blockedProfiles) : [],
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

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || "Credenciales incorrectas" };
    }
  };

  /**
   * 📝 REGISTRO
   */
  const register = async (registerData: any) => {
    try {
      const { registerRequest } = await import("../services/auth.api");
      const data = await registerRequest(registerData);

      if (data.activationRequired) {
        return {
          success: true,
          activationRequired: true,
          alreadyExists: (data as any).alreadyExists ?? false,
        };
      }

      if (!data.access_token) throw new Error("No access token returned");

      localStorage.setItem("token", data.access_token);

      const loggedUser: User = {
        ...data.user,
        profiles: parseProfiles(data.user?.profiles ?? registerData.profiles),
        blockedProfiles: data.user?.blockedProfiles ? parseProfiles(data.user.blockedProfiles) : [],
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

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || "Error al registrarse" };
    }
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
