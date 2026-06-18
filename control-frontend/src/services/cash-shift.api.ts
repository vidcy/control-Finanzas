import axios from './axios';

export const openCashShiftRequest = async (initialBalance: number) => {
  const res = await axios.post('/cash-shift/open', { initialBalance });
  return res.data;
};

export const closeCashShiftRequest = async () => {
  const res = await axios.post('/cash-shift/close');
  return res.data;
};

export const getActiveCashShiftRequest = async () => {
  const res = await axios.get('/cash-shift/active');
  return res.data; // Retorna null si no hay abierta, o { id, initialBalance, currentSales, ... } si está abierta
};

export const getCashShiftHistoryRequest = async () => {
  const res = await axios.get('/cash-shift/history');
  return res.data;
};
