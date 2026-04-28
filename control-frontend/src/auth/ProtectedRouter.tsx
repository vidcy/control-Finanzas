import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import type { JSX } from "react";

export const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
    const { token } = useAuth();

    // si no hay token → login
    if (!token) return <Navigate to="/login" />;

    return children;
};