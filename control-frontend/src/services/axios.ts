// Importamos la librería axios
import Axios from "axios";

/**
 * 🌐 Creamos una instancia personalizada de axios
 * Esto sirve para no repetir la URL del backend en cada request
 */
const API = Axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  // console.log("BASE URL:", import.meta.env.VITE_API_URL);
});
//console.log("🔥 VITE_API_URL =", import.meta.env.VITE_API_URL);
// 🔐 INTERCEPTOR JWT
API.interceptors.request.use((config) => {
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
