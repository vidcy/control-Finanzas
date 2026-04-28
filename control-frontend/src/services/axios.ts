// Importamos la librería axios
import Axios from "axios";

/**
 * 🌐 Creamos una instancia personalizada de axios
 * Esto sirve para no repetir la URL del backend en cada request
 */
const axios = Axios.create({
    baseURL: "http://localhost:3000", // backend NestJS
});

/**
 * 👇 Exportamos por DEFAULT
 * Esto permite importarlo así:
 * import axios from "./axios"
 */
export default axios;