import API from "./axios";

export const createTransactionRequest = async (data: {
  name: string;
  type: "INCOME" | "EXPENSE";
  categoryId: string;
  subCategoryId: string;
  amount: number;
  date: string;
  dueDate?: string;
  status: "PENDING" | "PAID";
  currency: "PEN" | "USD";
  exchangeRate?: number;
  paymentMethod: string;
  description?: string;
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

export const getTransactionsRequest = async () => {
  try {
    const res = await API.get("/transactions");
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
    subCategoryId: string;
    amount: number;
    date: string;
    dueDate?: string;
    currency: "PEN" | "USD";
    exchangeRate?: number;
    paymentMethod: string;
    description?: string;
  },
) => {
  try {
    const payload = {
      ...data,
      date: new Date(data.date).toISOString(),
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
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
