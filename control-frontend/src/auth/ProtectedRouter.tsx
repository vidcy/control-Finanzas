import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import type { JSX } from "react";

export const ProtectedRoute = ({ children, role }: { children: JSX.Element; role?: string }) => {
  const { token, user } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" />;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-bold text-gray-500 font-sans">
        Cargando perfil...
      </div>
    );
  }

  if (role && user.role !== role) {
    return <Navigate to="/workspace-selection" />;
  }

  const profiles = Array.isArray(user.profiles) ? user.profiles : [];

  // Validar acceso al espacio BUSINESS
  if (location.pathname.startsWith("/business") && !profiles.includes("BUSINESS")) {
    return <Navigate to="/workspace-selection" />;
  }

  // Validar acceso al espacio PERSONAL
  const personalPaths = ["/dashboard", "/income", "/expenses", "/pending"];
  if (personalPaths.some(p => location.pathname === p || location.pathname.startsWith(p + "/")) && !profiles.includes("PERSONAL")) {
    return <Navigate to="/workspace-selection" />;
  }

  return children;
};