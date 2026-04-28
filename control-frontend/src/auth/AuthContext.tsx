import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { loginRequest } from "../services/auth.api";

interface AuthContextType {
    token: string | null;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    // 🔐 token global
    const [token, setToken] = useState<string | null>(
        localStorage.getItem("token")
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
            setToken(data.access_token);

            return true; // 👈 LOGIN OK
        } catch (error) {
            return false; // 👈 LOGIN FAIL
        }
    };

    const logout = () => {
        localStorage.removeItem("token");
        setToken(null);
    };

    return (
        <AuthContext.Provider value={{ token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth fuera de provider");
    return ctx;
};