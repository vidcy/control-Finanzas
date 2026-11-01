// Importamos la librería axios
import Axios from "axios";

/**
 * 🌐 Determinamos la URL base dinámica para el backend:
 * - Si estamos en el navegador en un dominio de producción (ej. think.ccoplex.com, www.think.ccoplex.com),
 *   conectamos directamente a https://api.ccoplex.com para evitar Mixed Content y asegurar disponibilidad pública.
 * - Si estamos en localhost / 127.0.0.1, usamos http://localhost:3000 o VITE_API_URL local.
 * - Respetamos cualquier VITE_API_URL explícita si apunta a una URL remota en la nube.
 */
export const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;

  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    const isLocal =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.endsWith(".local");

    if (!isLocal) {
      if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
        return envUrl;
      }
      return "https://api.ccoplex.com";
    }
  }

  return envUrl || "http://localhost:3000";
};

/**
 * 🌐 Creamos una instancia personalizada de axios
 * Esto sirve para no repetir la URL del backend en cada request
 */
const API = Axios.create({
  baseURL: getApiBaseUrl(),
});

// 🔐 INTERCEPTOR JWT & Corrección dinámica de BaseURL en solicitudes
API.interceptors.request.use((config) => {
  // Aseguramos que en producción nunca viaje a localhost
  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    const isLocal =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.endsWith(".local");

    if (!isLocal) {
      if (!config.baseURL || config.baseURL.includes("localhost") || config.baseURL.includes("127.0.0.1")) {
        config.baseURL = "https://api.ccoplex.com";
      }
    }
  }

  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// 🔔 INTERCEPTOR DE RESPUESTA: Normalización de mensajes de error
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorData = error.response?.data;
    if (errorData) {
      const extractedMessage =
        errorData?.error?.message ||
        errorData?.message ||
        (typeof errorData?.error === "string" ? errorData.error : null);
      if (extractedMessage) {
        errorData.message = extractedMessage;
      }
    }
    return Promise.reject(error);
  }
);

/**
 * 👇 Exportamos por DEFAULT
 * Esto permite importarlo así:
 * import axios from "./axios"
 */
export default API;
