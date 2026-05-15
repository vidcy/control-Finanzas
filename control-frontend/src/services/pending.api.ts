import API from "./axios";
export const listPendingTransactionsRequest = async () => {
  try {
    const res = await API.get("/pending");
    return res.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message ||
      "Error al listar las transacciones pendientes",
    );
  }
};
export const createPendingTransactionRequest = async (data: {
  name: string;
  type: "INCOME" | "EXPENSE";
  categoryId: string;
  subCategoryId: string;
  amount: number;
  date: string;
  status: "PENDING";
  currency: "PEN" | "USD";
  exchangeRate?: number;
  description?: string;
}) => {
  try {
    const res = await API.post("/pending", data);
    return res.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message ||
      "Error al crear la transacción pendiente",
    );
  }
};
export const deletePendingTransactionRequest = async (id: string) => {
  try {
    const res = await API.delete(`/pending/${id}`);
    return res.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message ||
      "Error al eliminar la transacción pendiente",
    );
  }
};
export const updatePendingTransactionRequest = async (
  id: string,
  data: {
    name?: string;
    status?: "PENDING" | "PAID";
    amount?: number;
    description?: string;
    date?: string;
    dueDate?: string;
    currency?: "PEN" | "USD";
    exchangeRate?: number;
    amountSoles?: number;
    categoryId?: string;
    subCategoryId?: string;
  },
) => {
  try {
    const res = await API.patch(`/pending/${id}`, data);
    return res.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message ||
      "Error al actualizar la transacción pendiente",
    );
  }
};
