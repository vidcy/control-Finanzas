import API from "./axios";

export interface LoginResponse {
    access_token: string;
    user: string;
}

/**
 * 🔐 LOGIN REAL
 * SOLO devuelve token si backend responde 200
 */
export const loginRequest = async (
    email: string,
    password: string
): Promise<LoginResponse> => {
    console.log(email, password)
    try {
        const res = await API.post("/auth/login", {
            email,
            password,
        });
        console.log("🔥 RESPUESTA COMPLETA:", res);
        console.log("🔥 RESPONSE.DATA:", res.data);
        console.log("🔥 TOKEN QUE ENVÍA BACKEND:", res.data.access_token);
        localStorage.setItem("token", res.data.access_token);
        // 👇 SI LLEGAMOS AQUÍ = backend respondió 200 OK
        return res.data;
    } catch (error: any) {
        // 👇 SI BACKEND RESPONDE 401 CAEMOS AQUÍ
        throw new Error(
            error?.response?.data?.message || "Credenciales incorrectas"
        );
    }
};


export const forgotPasswordRequest = async (email: string) => {
    try {
        const res = await API.post("/auth/forgot-password", {
            email,
        });
        return res.data;
    } catch (error: any) {
        throw new Error(
            error?.response?.data?.message || "Error al enviar el correo"
        );
    }
}
export const resetPasswordRequest = async (
    token: string | null,
    newPassword: string
) => {
    console.log(token, newPassword)
    try {
        const res = await API.post("/auth/reset-password", {
            token,
            newPassword,
        });
        return res.data;
    } catch (error: any) {
        throw new Error(
            error?.response?.data?.message || "Error al restablecer la contraseña"
        );
    }
}
export const changePasswordRequest = async (
    currentPassword: string,
    newPassword: string
) => {
    try {
        const res = await API.post("/auth/change-password", {
            currentPassword,   // 👈 ESTE NOMBRE ES CLAVE
            newPassword,
        });

        return res.data;
    } catch (error: any) {
        throw new Error(
            error?.response?.data?.message || "Error al cambiar contraseña"
        );
    }
};
