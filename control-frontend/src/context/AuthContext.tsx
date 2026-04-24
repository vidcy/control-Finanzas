import { createContext, useContext, useState } from "react";
import { loginRequest } from "../services/api";
import type { User } from "../types/auth.types";

// 📌 Tipo de lo que tendrá nuestro contexto global
interface AuthContextType {
    user: User | null;                    // usuario logueado
    token: string | null;                // token JWT
    login: (email: string, password: string) => Promise<void>; // función login
    logout: () => void;                  // función logout
}

// 📌 Creamos el contexto vacío
const AuthContext = createContext<AuthContextType | null>(null);

// 📌 Hook personalizado para usar el contexto fácilmente
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
    return context;
};

// 📌 Este componente envolverá TODA la app
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {

    // 🔹 Guardamos token globalmente
    const [token, setToken] = useState<string | null>(
        localStorage.getItem("token") // si recargas la página mantiene sesión
    );

    // 🔹 Guardamos usuario globalmente
    const [user, setUser] = useState<User | null>(null);

    // 🔐 FUNCIÓN LOGIN REAL
    const login = async (email: string, password: string) => {

        // llamamos al backend
        const data = await loginRequest(email, password);

        // guardamos token en memoria
        setToken(data.access_token);

        // guardamos token en navegador (persistencia)
        localStorage.setItem("token", data.access_token);
    };

    // 🚪 FUNCIÓN LOGOUT
    const logout = () => {
        setToken(null);                // borramos token
        setUser(null);                 // borramos usuario
        localStorage.removeItem("token"); // borramos del navegador
    };

    // 📌 Compartimos todo con la app
    return (
        <AuthContext.Provider value={{ user, token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};