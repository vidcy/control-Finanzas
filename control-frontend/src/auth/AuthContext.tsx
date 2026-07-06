import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { loginRequest, registerRequest } from "../services/auth.api";
import { getUserRequest } from "../services/user.api";

export type WorkspaceType = "PERSONAL" | "BUSINESS";

export interface User {
  id: string;
  name: string;
  lastName?: string;
  email: string;
  role?: string;
  profiles: string[];
  blockedProfiles?: string[];
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
  userProfiles: string[];
  syncProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

/** Safely parse profiles — handles string JSON, array, or null */
const parseProfiles = (raw: any): string[] => {
  if (!raw) return ["PERSONAL"];
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as string[];
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

  const userProfiles: string[] = parseProfiles(user?.profiles);

  const syncProfile = async () => {
    try {
      if (!token) return;
      const freshUser = await getUserRequest();

      if (freshUser.isActive === false) {
        logout();
        return;
      }

      const parsedProfiles = parseProfiles(freshUser.profiles);
      const parsedBlocked = freshUser.blockedProfiles ? parseProfiles(freshUser.blockedProfiles) : [];
      
      // Auto-inject missing business submodules if they have BUSINESS and it's not blocked
      if (parsedProfiles.includes("BUSINESS")) {
         const subs = [
           "BUSINESS_DASHBOARD", "BUSINESS_POS", "BUSINESS_INVENTORY",
           "BUSINESS_FINANCE", "BUSINESS_CASH_REGISTER", "BUSINESS_PENDING",
           "BUSINESS_REPORTS", "BUSINESS_HISTORY", "BUSINESS_CATEGORIES", "BUSINESS_WORKERS"
         ];
         subs.forEach(s => {
           if (!parsedProfiles.includes(s) && !parsedBlocked.includes(s)) {
             parsedProfiles.push(s);
           }
         });
      }

      const loggedUser: User = {
        ...freshUser,
        profiles: parsedProfiles,
        blockedProfiles: parsedBlocked,
      };

      localStorage.setItem("user", JSON.stringify(loggedUser));
      setUser(loggedUser);

      const userProfs = loggedUser.profiles;
      if (loggedUser.parentId) {
        setActiveWorkspace("BUSINESS");
      } else if (userProfs.length === 1) {
        setActiveWorkspace(userProfs[0] as WorkspaceType);
      } else if (activeWorkspace && !userProfs.includes(activeWorkspace)) {
        setActiveWorkspaceState(null);
        localStorage.removeItem("activeWorkspace");
      }
    } catch (error: any) {
      console.error("Error syncing profile with backend:", error);
      if (error?.response?.status === 401) {
        logout();
      }
    }
  };

  // Sync user profile with backend on mount/token change
  useEffect(() => {
    if (!token) return;
    syncProfile();
  }, [token]);

  /**
   * 🔐 LOGIN
   */
  const login = async (email: string, password: string) => {
    try {
      const data = await loginRequest(email, password);

      if (!data.access_token) throw new Error("Token no recibido");

      localStorage.setItem("token", data.access_token);

      const parsedProfiles = parseProfiles(data.user?.profiles);
      const parsedBlocked = data.user?.blockedProfiles ? parseProfiles(data.user.blockedProfiles) : [];
      
      if (parsedProfiles.includes("BUSINESS")) {
         const subs = [
           "BUSINESS_DASHBOARD", "BUSINESS_POS", "BUSINESS_INVENTORY",
           "BUSINESS_FINANCE", "BUSINESS_CASH_REGISTER", "BUSINESS_PENDING",
           "BUSINESS_REPORTS", "BUSINESS_HISTORY", "BUSINESS_CATEGORIES", "BUSINESS_WORKERS"
         ];
         subs.forEach(s => {
           if (!parsedProfiles.includes(s) && !parsedBlocked.includes(s)) {
             parsedProfiles.push(s);
           }
         });
      }

      const loggedUser: User = {
        ...data.user,
        profiles: parsedProfiles,
        blockedProfiles: parsedBlocked,
      };

      localStorage.setItem("user", JSON.stringify(loggedUser));

      const userProfs = loggedUser.profiles;
      if (loggedUser.parentId) {
        setActiveWorkspace("BUSINESS");
      } else if (userProfs.length === 1) {
        setActiveWorkspace(userProfs[0] as WorkspaceType);
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
      if (loggedUser.parentId) {
        setActiveWorkspace("BUSINESS");
      } else if (userProfs.length === 1) {
        setActiveWorkspace(userProfs[0] as WorkspaceType);
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
        syncProfile,
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
