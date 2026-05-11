import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { loginRequest } from "../services/auth.api";


interface AuthContextType {
    token: string | null;
    user: any;
    setUser: (user: any) => void;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    // 🔐 token global
    const [token, setToken] = useState<string | null>(
        localStorage.getItem("token")
    );
    const [user, setUser] = useState<any>(
        JSON.parse(localStorage.getItem("user") || "null")
    );
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
            localStorage.setItem("user", JSON.stringify(data.user));
            setToken(data.access_token);
            setUser(data.user);

            return true; // 👈 LOGIN OK
        } catch (error) {
            return false; // 👈 LOGIN FAIL
        }
    };

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ token, login, logout, user, setUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth fuera de provider");
    return ctx;
};