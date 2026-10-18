import API from "./axios";

export interface Branch {
  id: string;
  name: string;
  code?: string;
  phone?: string;
  address?: string | null;
  department?: string | null;
  province?: string | null;
  district?: string | null;
  taxRegime?: string | null;
  igvRate?: number | null;
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

export const createBranchRequest = async (data: Partial<Branch>): Promise<Branch> => {
  try {
    const res = await API.post("/branches", data);
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || "Error al crear sede");
  }
};

export const updateBranchRequest = async (id: string, data: Partial<Branch>): Promise<Branch> => {
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

export const adjustBranchStockRequest = async (data: {
  productId: string;
  branchId: string;
  stock: number;
}) => {
  try {
    const res = await API.post("/branches/adjust", data);
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || "Error al ajustar inventario de sede");
  }
};
