// 📌 Representa al usuario que viene del backend
export interface User {
    id: string;        // UUID del usuario
    email: string;     // correo del usuario
}

// 📌 Respuesta del backend cuando hacemos login
export interface LoginResponse {
    access_token: string; // JWT que nos da el backend
}