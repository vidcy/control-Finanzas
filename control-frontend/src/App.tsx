import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import AppRoutes from "./auth/AppRouter";
import { Toaster } from "react-hot-toast";
import { TransactionModalProvider } from "./auth/TransactionModalContext";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TransactionModalProvider> {/* 👈 Envuelve tu aplicación con el proveedor */}
          <Toaster position="top-right" />
          <AppRoutes />
        </TransactionModalProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;