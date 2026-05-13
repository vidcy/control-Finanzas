// Importamos la librería axios
import Axios from "axios";

/**
 * 🌐 Creamos una instancia personalizada de axios
 * Esto sirve para no repetir la URL del backend en cada request
 */
const API = Axios.create({
  baseURL: "import.meta.env.VITE_API_URL", // backend NestJS
});

// 🔐 INTERCEPTOR JWT
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

/**
 * 👇 Exportamos por DEFAULT
 * Esto permite importarlo así:
 * import axios from "./axios"
 */
export default API;
