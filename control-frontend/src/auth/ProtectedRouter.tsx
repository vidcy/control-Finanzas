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

  const profileToPathMap: Record<string, string> = {
    BUSINESS_DASHBOARD: "/business-dashboard",
    BUSINESS_POS: "/business-pos",
    BUSINESS_INVENTORY: "/business-inventory",
    BUSINESS_FINANCE: "/business-finance",
    BUSINESS_CASH_REGISTER: "/business-cash-register",
    BUSINESS_PENDING: "/business-pending",
    BUSINESS_REPORTS: "/business-reports",
    BUSINESS_HISTORY: "/business-history",
    BUSINESS_CATEGORIES: "/categories",
  };

  if (user.parentId) {
    // If worker tries to access personal paths or workspace selection
    const isPersonalPath = ["/dashboard", "/income", "/expenses", "/pending", "/users", "/workspace-selection"].some(
      p => location.pathname === p || location.pathname.startsWith(p + "/")
    );
    
    // Find matching profile for current path
    const matchingProfile = Object.keys(profileToPathMap).find(
      key => profileToPathMap[key] === location.pathname || location.pathname.startsWith(profileToPathMap[key] + "/")
    );

    // If accessing personal path or a business path not in their allowed profiles
    if (isPersonalPath || (matchingProfile && !profiles.includes(matchingProfile))) {
      // Redirect to the first allowed business path
      const firstProfile = profiles.find(p => profileToPathMap[p]);
      const targetPath = firstProfile ? profileToPathMap[firstProfile] : "/business-pos";
      return <Navigate to={targetPath} replace />;
    }
    
    return children;
  }

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