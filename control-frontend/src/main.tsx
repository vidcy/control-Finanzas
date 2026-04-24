
import './index.css'
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";

// 🔌 React arranca aquí
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* Envolvemos la app con el AuthProvider */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);