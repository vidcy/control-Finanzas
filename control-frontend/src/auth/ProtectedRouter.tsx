import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import type { JSX } from "react";

export const ProtectedRoute = ({ children, role }: { children: JSX.Element, role?: string }) => {
    const { token } = useAuth();
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    // si no hay token → login
    if (!token) return <Navigate to="/login" />;
    if (role && user.role !== role) return <Navigate to="/dashboard" />;

    return children;
};