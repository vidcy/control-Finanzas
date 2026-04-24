// Usaremos fetch para llamar al backend
const API_URL = "http://localhost:3000"; // ⚠️ tu backend Nest corre aquí

// 📌 Función para hacer login
export async function loginRequest(email: string, password: string) {

    // Enviamos petición POST al backend
    const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json", // indicamos que enviamos JSON
        },
        body: JSON.stringify({
            email,      // enviamos email
            password,   // enviamos password
        }),
    });

    // Convertimos la respuesta a JSON
    const data = await response.json();

    // Si el backend devuelve error → lo lanzamos
    if (!response.ok) {
        throw new Error(data.message || "Error al iniciar sesión");
    }

    // Si todo va bien devolvemos la data
    return data;
}