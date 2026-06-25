import API from "./axios";

export interface Branch {
  id: string;
  name: string;
  address?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export const getBranchesRequest = async (): Promise<Branch[]> => {
  try {
    const res = await API.get("/branches");
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || "Error al obtener sedes");
  }
};

export const createBranchRequest = async (data: { name: string; address?: string }): Promise<Branch> => {
  try {
    const res = await API.post("/branches", data);
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || "Error al crear sede");
  }
};

export const updateBranchRequest = async (id: string, data: { name?: string; address?: string }): Promise<Branch> => {
  try {
    const res = await API.patch(`/branches/${id}`, data);
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || "Error al actualizar sede");
  }
};

export const deleteBranchRequest = async (id: string): Promise<void> => {
  try {
    await API.delete(`/branches/${id}`);
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || "Error al eliminar sede");
  }
};

export const getBranchStocksRequest = async () => {
  try {
    const res = await API.get("/branches/stocks");
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || "Error al obtener inventario por sedes");
  }
};

export const transferStockRequest = async (data: {
  productId: string;
  fromBranchId: string;
  toBranchId: string;
  quantity: number;
}) => {
  try {
    const res = await API.post("/branches/transfer", data);
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || "Error al transferir inventario");
  }
};
