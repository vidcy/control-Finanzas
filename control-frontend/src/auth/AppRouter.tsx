import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import RecoverPasswordPage from "../pages/RecoverPasswordPage";
import DashboardPage from "../pages/DashboardPage";
import { ProtectedRoute } from "../auth/ProtectedRouter";
import UsersPage from "../pages/UserPage";
import IncomePage from "../pages/IncomePage";
import ExpensesPage from "../pages/ExpensesPage";
import CategoriesPage from "../pages/CategoriesPage";
import PendingPage from "../pages/PendingPage";

export default function AppRoutes() {
    return (
        <Routes>
            {/* ruta pública */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<RecoverPasswordPage />} />
            <Route path="/reset-password" element={<RecoverPasswordPage />} />


            {/* rutas protegidas */}
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/income" element={<ProtectedRoute><IncomePage /></ProtectedRoute>} />
            <Route path="/expenses" element={<ProtectedRoute><ExpensesPage /></ProtectedRoute>} />
            <Route path="/categories" element={<ProtectedRoute><CategoriesPage /></ProtectedRoute>} />
            <Route path="/pending" element={<ProtectedRoute><PendingPage /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute role="ADMIN"><UsersPage /></ProtectedRoute>} />

            {/* redirección automática */}
            <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
    );
}