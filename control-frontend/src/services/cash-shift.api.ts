import axios from './axios';

export const openCashShiftRequest = async (
  initialBalance: number,
  branchId?: string,
  categoryId?: string,
  subCategoryId?: string,
  password?: string,
) => {
  const res = await axios.post('/cash-shift/open', {
    initialBalance,
    branchId,
    categoryId,
    subCategoryId,
    password,
  });
  return res.data;
};

export const closeCashShiftRequest = async (
  categoryId?: string,
  subCategoryId?: string,
  password?: string,
) => {
  const res = await axios.post('/cash-shift/close', {
    categoryId,
    subCategoryId,
    password,
  });
  return res.data;
};

export const getActiveCashShiftRequest = async () => {
  const res = await axios.get('/cash-shift/active');
  return res.data; // Retorna null si no hay abierta, o { id, initialBalance, currentSales, ... } si está abierta
};

export interface GetShiftHistoryParams {
  page?: number;
  limit?: number;
  branchId?: string;
  workerId?: string;
  startDate?: string;
  endDate?: string;
}

export const getCashShiftHistoryRequest = async (params?: GetShiftHistoryParams) => {
  const res = await axios.get('/cash-shift/history', { params });
  return res.data; // Returns { items, total, page, limit, totalPages }
};

export const getCashShiftDetailsRequest = async (id: string) => {
  const res = await axios.get(`/cash-shift/${id}`);
  return res.data; // Returns { shift: {...}, sales: [...] }
};
