import API from "./axios";

export interface LoginResponse {
  access_token: string;
}

/**
 * 🔐 LOGIN REAL
 * SOLO devuelve token si backend responde 200
 */
export const registerRequest = async (
  name: string,
  lastName: string,
  email: string,
  password: string,
  role?: string,
  status?: boolean,
  profiles?: string[],
  parentId?: string | null
) => {
  try {
    const res = await API.post("/users", {
      name,
      lastName,
      email,
      password,
      role,
      isActive: status,
      profiles,
      parentId,
    });

    // 👇 SI LLEGAMOS AQUÍ = backend respondió 200 OK
    return res.data;
  } catch (error: any) {
    // 👇 SI BACKEND RESPONDE 401 CAEMOS AQUÍ
    throw new Error(error?.response?.data?.message || "Error al registrarse");
  }
};
export const getUserRequest = async () => {
  try {
    const res = await API.get("/users/me");
    return res.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Error al obtener usuario",
    );
  }
};
export const updateUserRequest = async (id: string, data: any) => {
  try {
    const res = await API.patch(`/users/${id}`, data);
    return res.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Error al actualizar usuario",
    );
  }
};
export const inactiveUserRequest = async (id: string) => {
  try {
    const res = await API.patch(`/users/${id}/inactive`);
    return res.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Error al desactivar usuario",
    );
  }
};
export const updateUserProfilesRequest = async (profiles: string[]) => {
  try {
    const res = await API.patch('/users/me/profiles', { profiles });
    return res.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Error al actualizar módulos",
    );
  }
};
export const activeUserRequest = async (id: string) => {
  try {
    const res = await API.patch(`/users/${id}/active`);
    return res.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Error al reactivar usuario",
    );
  }
};
export const listUsersRequest = async () => {
  try {
    const res = await API.get("/users");
    return res.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Error al listar usuarios",
    );
  }
};
export const getMeRequest = async () => {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("No hay token");
  }

  const res = await API.get("/users/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
};

export const updateMyProfileRequest = async (data: any) => {
  try {
    const res = await API.patch("/users/me/profile", data);
    return res.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Error al actualizar perfil",
    );
  }
};

export const getWorkersRequest = async () => {
  try {
    const res = await API.get("/users/workers");
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || "Error al obtener trabajadores");
  }
};

export const createWorkerRequest = async (data: any) => {
  try {
    const res = await API.post("/users/workers", data);
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || "Error al crear trabajador");
  }
};

export const updateWorkerRequest = async (id: string, data: any) => {
  try {
    const res = await API.patch(`/users/workers/${id}`, data);
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || "Error al actualizar trabajador");
  }
};

export const deleteWorkerRequest = async (id: string) => {
  try {
    const res = await API.delete(`/users/workers/${id}`);
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || "Error al eliminar trabajador");
  }
};

