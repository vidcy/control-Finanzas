import axios from "./axios";

export interface LoginResponse {
    access_token: string;
}

/**
 * 🔐 LOGIN REAL
 * SOLO devuelve token si backend responde 200
 */
export const loginRequest = async (
    email: string,
    password: string
): Promise<LoginResponse> => {
    try {
        const res = await axios.post("/auth/login", {
            email,
            password,
        });

        // 👇 SI LLEGAMOS AQUÍ = backend respondió 200 OK
        return res.data;
    } catch (error: any) {
        // 👇 SI BACKEND RESPONDE 401 CAEMOS AQUÍ
        throw new Error(
            error?.response?.data?.message || "Credenciales incorrectas"
        );
    }
};