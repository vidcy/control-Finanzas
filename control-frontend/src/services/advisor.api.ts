import API from "./axios";

export interface CommissionModel {
  id: string;
  name: string;
  type: string; // PERCENT, FIXED, SPLIT
  value: number;
  applyTo: string; // SALE, PROFIT
  minCommission: number;
  maxCommission: number | null;
  allowDiscounts: boolean;
  allowManualEdit: boolean;
  isAdditional?: boolean;
  categoryIds: string[] | null;
  brandIds: string[] | null;
  productIds: string[] | null;
  createdAt: string;
  updatedAt: string;
  advisors?: Advisor[];
  _count?: {
    advisors: number;
  };
}

export interface Advisor {
  id: string;
  name: string;
  commissionPercentage: number;
  commissionType: string;
  commissionValue: number;
  isActive: boolean;
  userId: string;
  commissionModelId?: string | null;
  commissionModel?: CommissionModel | null;
  createdAt: string;
  updatedAt: string;
}

export const createAdvisorRequest = async (data: { name: string; commissionPercentage?: number; commissionType?: string; commissionValue?: number; isActive?: boolean; commissionModelId?: string | null }) => {
  try {
    const res = await API.post("/advisors", data);
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || "Error al crear el asesor");
  }
};

export const getAdvisorsRequest = async (params?: { isActive?: boolean }) => {
  try {
    const res = await API.get("/advisors", { params });
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || "Error al obtener los asesores");
  }
};

export const updateAdvisorRequest = async (id: string, data: Partial<{ name: string; commissionPercentage: number; commissionType: string; commissionValue: number; isActive: boolean; commissionModelId: string | null }>) => {
  try {
    const res = await API.patch(`/advisors/${id}`, data);
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || "Error al actualizar el asesor");
  }
};

export const deleteAdvisorRequest = async (id: string) => {
  try {
    const res = await API.delete(`/advisors/${id}`);
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || "Error al eliminar el asesor");
  }
};

export const getCommissionsReportRequest = async (params?: { advisorId?: string; startDate?: string; endDate?: string }) => {
  try {
    const res = await API.get("/advisors/commissions-report", { params });
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || "Error al obtener el reporte de comisiones");
  }
};

export const updateCommissionStatusRequest = async (id: string, status: string) => {
  try {
    const res = await API.patch(`/advisors/commissions/${id}/status`, { status });
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || "Error al actualizar estado de comisión");
  }
};

export const createCommissionModelRequest = async (data: any) => {
  try {
    const res = await API.post("/commission-models", data);
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || "Error al crear modelo de comisión");
  }
};

export const getCommissionModelsRequest = async () => {
  try {
    const res = await API.get("/commission-models");
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || "Error al obtener modelos de comisión");
  }
};

export const updateCommissionModelRequest = async (id: string, data: any) => {
  try {
    const res = await API.patch(`/commission-models/${id}`, data);
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || "Error al actualizar modelo de comisión");
  }
};

export const deleteCommissionModelRequest = async (id: string) => {
  try {
    const res = await API.delete(`/commission-models/${id}`);
    return res.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || "Error al eliminar modelo de comisión");
  }
};
