import API from "./axios";

export const createTransactionRequest = async (data: {
  name: string;
  type: "INCOME" | "EXPENSE";
  categoryId: string;
  subCategoryId?: string | null;
  amount: number;
  date: string;
  dueDate?: string;
  paidAt?: string;
  status: "PAID";
  currency: "PEN" | "USD";
  exchangeRate?: number;
  paymentMethod: string;
  description?: string;
  workspace?: string;
  receiptUrl?: string | null;
}) => {
  try {
    const res = await API.post("/transactions", data);
    return res.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Error al crear la transacción",
    );
  }
};

export interface GetTransactionsParams {
  workspace?: string;

  startDate?: string;
  endDate?: string;
  userId?: string;
  branchId?: string;
}

export const getTransactionsRequest = async (params?: GetTransactionsParams) => {
  try {
    const res = await API.get("/transactions", { params });
    return res.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Error al obtener las transacciones",
    );
  }
};

export const getTransactionRequestId = async (id: string) => {
  try {
    const res = await API.get(`/transactions/${id}`);
    return res.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Error al obtener la transacción",
    );
  }
};

export const updateTransactionRequest = async (
  id: string,
  data: {
    categoryId: string;
    subCategoryId?: string | null;
    amount: number;
    date: Date;
    dueDate?: Date;
    paidAt?: Date;
    currency: "PEN" | "USD";
    exchangeRate?: number;
    paymentMethod: string;
    description?: string;
    name?: string;
    receiptUrl?: string | null;
  },
) => {
  try {
    const payload = {
      ...data,
      date: new Date(data.date),
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      paidAt: data.paidAt ? new Date(data.paidAt) : undefined,
    };

    const res = await API.patch(`/transactions/${id}`, payload);

    return res.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Error al actualizar la transacción",
    );
  }
};

export const deleteTransactionRequest = async (id: string) => {
  try {
    const res = await API.delete(`/transactions/${id}`);
    return res.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Error al eliminar la transacción",
    );
  }
};
export const markAsPendingRequest = async (
  id: string,
  data: { status: "PENDING" | "PAID" },
) => {
  try {
    const res = await API.patch(`/transactions/${id}/mark-pending`, data);
    return res.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Error al Mover a cuentas pendientes",
    );
  }
};

export const getAuditLogsRequest = async () => {
  try {
    const res = await API.get("/audit-logs");
    return res.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Error al obtener la bitácora de auditoría",
    );
  }
};

export const retryBillingRequest = async (transactionId: string) => {
  try {
    const res = await API.post(`/transactions/${transactionId}/retry-billing`);
    return res.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Error al reintentar la emisión del comprobante",
    );
  }
};

