import API from "./axios";

export interface Advisor {
  id: string;
  name: string;
  commissionPercentage: number;
  isActive: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export const createAdvisorRequest = async (data: { name: string; commissionPercentage: number; isActive?: boolean }) => {
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

export const updateAdvisorRequest = async (id: string, data: Partial<{ name: string; commissionPercentage: number; isActive: boolean }>) => {
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
