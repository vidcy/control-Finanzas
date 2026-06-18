import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import WorkspaceSelectionPage from "../pages/WorkspaceSelectionPage";
import BusinessDashboardPage from "../pages/BusinessDashboardPage";
import BusinessPosPage from "../pages/BusinessPosPage";
import BusinessPendingPage from "../pages/BusinessPendingPage";
import BusinessInventoryPage from "../pages/BusinessInventoryPage";
import BusinessReportsPage from "../pages/BusinessReportsPage";
import BusinessFinancePage from "../pages/BusinessFinancePage";
import BusinessCashRegisterPage from "../pages/BusinessCashRegisterPage";
import RecoverPasswordPage from "../pages/RecoverPasswordPage";
import DashboardPage from "../pages/DashboardPage";
import { ProtectedRoute } from "../auth/ProtectedRouter";
import UsersPage from "../pages/UserPage";
import IncomePage from "../pages/IncomePage";
import ExpensesPage from "../pages/ExpensesPage";
import CategoriesPage from "../pages/CategoriesPage";
import PendingPage from "../pages/PendingPage";
import BusinessHistoryPage from "../pages/BusinessHistoryPage";

export default function AppRoutes() {
  return (
    <Routes>
      {/* ruta pública */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<RecoverPasswordPage />} />
      <Route path="/reset-password" element={<RecoverPasswordPage />} />

      {/* rutas protegidas */}
      <Route
        path="/workspace-selection"
        element={
          <ProtectedRoute>
            <WorkspaceSelectionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/business-dashboard"
        element={
          <ProtectedRoute>
            <BusinessDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/business-pending"
        element={
          <ProtectedRoute>
            <BusinessPendingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/business-pos"
        element={
          <ProtectedRoute>
            <BusinessPosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/business-inventory"
        element={
          <ProtectedRoute>
            <BusinessInventoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/business-reports"
        element={
          <ProtectedRoute>
            <BusinessReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/business-finance"
        element={
          <ProtectedRoute>
            <BusinessFinancePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/business-cash-register"
        element={
          <ProtectedRoute>
            <BusinessCashRegisterPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/business-history"
        element={
          <ProtectedRoute>
            <BusinessHistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/income"
        element={
          <ProtectedRoute>
            <IncomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses"
        element={
          <ProtectedRoute>
            <ExpensesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/categories"
        element={
          <ProtectedRoute>
            <CategoriesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pending"
        element={
          <ProtectedRoute>
            <PendingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute role="ADMIN">
            <UsersPage />
          </ProtectedRoute>
        }
      />

      {/* redirección automática */}
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}
