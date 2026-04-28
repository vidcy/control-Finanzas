import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/DashboardPage";
import { ProtectedRoute } from "../auth/ProtectedRouter";

export default function AppRoutes() {
    return (
        <Routes>
            {/* ruta pública */}
            <Route path="/login" element={<LoginPage />} />

            {/* ruta protegida */}
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <DashboardPage />
                    </ProtectedRoute>
                }
            />

            {/* redirección automática */}
            <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
    );
}